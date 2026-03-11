import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../../constants/api';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: Option[];
}

export default function ExamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { categoryId, categoryName, mode, examPeriod, questionCount } = params;
  const resolvedCategoryId = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  const resolvedCategoryName = Array.isArray(categoryName) ? categoryName[0] : categoryName;
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedExamPeriod = Array.isArray(examPeriod) ? examPeriod[0] : examPeriod;
  const resolvedQuestionCount = Number(Array.isArray(questionCount) ? questionCount[0] : questionCount);
  const questionLimit = Number.isFinite(resolvedQuestionCount) && resolvedQuestionCount > 0 ? resolvedQuestionCount : 50;
  const isWrongMode = resolvedMode === 'wrong';
  const isAdaptiveMode = resolvedMode === 'adaptive';
  const isPracticeMode = resolvedMode === 'practice' || isWrongMode;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const questionsRef = useRef<Question[]>([]);
  const answersRef = useRef<Record<string, string>>({});

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const fetchQuestions = useCallback(async () => {
    try {
      let response;
      if (isWrongMode) {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
          router.replace('/auth/login');
          return;
        }
        response = await axios.get(`${API_BASE_URL}/results/wrong-questions`, {
          params: { limit: questionLimit },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else if (isAdaptiveMode) {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
          router.replace('/auth/login');
          return;
        }
        response = await axios.get(`${API_BASE_URL}/results/adaptive-questions`, {
          params: {
            limit: questionLimit,
            categoryId: resolvedCategoryId,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        response = await axios.get(`${API_BASE_URL}/questions`, {
          params: {
            categoryId: resolvedCategoryId,
            category: resolvedCategoryName,
            examPeriod: resolvedExamPeriod,
            limit: questionLimit,
          },
        });
      }
      setQuestions(response.data);
      setCurrentIndex(0);
      setAnswers({});
      setTimeLeft(45 * 60);
    } catch (error) {
      console.error('Error fetching questions:', error);
      Alert.alert('Hata', 'Sorular yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [isAdaptiveMode, isWrongMode, questionLimit, resolvedCategoryId, resolvedCategoryName, resolvedExamPeriod, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (questionId: string, optionId: string) => {
    // In practice mode, prevent changing answer after selection because feedback is immediate
    if (isPracticeMode && answers[questionId]) return;
    
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const finishExam = useCallback(async () => {
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;
    // Calculate score
    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    const correctQuestionIds: string[] = [];
    const wrongQuestionIds: string[] = [];

    currentQuestions.forEach((q) => {
      const userAnswerId = currentAnswers[q.id];
      if (!userAnswerId) {
        emptyCount++;
      } else {
        const correctOption = q.options.find((o) => o.isCorrect);
        if (correctOption && correctOption.id === userAnswerId) {
          correctCount++;
          correctQuestionIds.push(q.id);
        } else {
          wrongCount++;
          wrongQuestionIds.push(q.id);
        }
      }
    });

    const total = currentQuestions.length;
    if (total === 0) {
      router.back();
      return;
    }
    const score = (correctCount / total) * 100;

    // Save result to backend
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        await axios.post(
          `${API_BASE_URL}/results`,
          {
            score,
            totalQuestions: total,
            correctCount,
            wrongCount,
            testType: resolvedCategoryName || (isWrongMode ? 'Yanlışlarım' : isAdaptiveMode ? 'Adaptif Deneme' : 'Genel Deneme'),
            correctQuestionIds,
            wrongQuestionIds,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error saving exam result:', error);
      // We don't block navigation on error, just log it
    }

    router.replace({
      pathname: '/quiz/result',
      params: {
        total,
        correct: correctCount,
        wrong: wrongCount,
        empty: emptyCount,
        score: score.toFixed(1),
        categoryName: resolvedCategoryName || (isWrongMode ? 'Yanlışlarım' : isAdaptiveMode ? 'Adaptif Deneme' : 'Genel Deneme'),
      },
    });
  }, [isAdaptiveMode, isWrongMode, resolvedCategoryName, router]);

  const confirmFinish = useCallback(() => {
    Alert.alert(
      'Sınavı Bitir',
      'Sınavı bitirmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Bitir', style: 'destructive', onPress: finishExam }
      ]
    );
  }, [finishExam]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (isPracticeMode) return;
    if (questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishExam, isPracticeMode, questions.length]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Sorular hazırlanıyor...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 18, color: '#374151', textAlign: 'center' }}>
          Bu kategoride henüz soru bulunmamaktadır.
        </Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];

  const getOptionStyle = (optionId: string) => {
    const isSelected = answers[currentQuestion.id] === optionId;
    const isCorrect = currentQuestion.options.find(o => o.id === optionId)?.isCorrect;
    const isAnswered = !!answers[currentQuestion.id];

    if (isPracticeMode && isAnswered) {
      if (isSelected && isCorrect) return [styles.optionButton, styles.optionCorrect];
      if (isSelected && !isCorrect) return [styles.optionButton, styles.optionWrong];
      if (!isSelected && isCorrect) return [styles.optionButton, styles.optionCorrect]; // Show correct answer
    } else {
      if (isSelected) return [styles.optionButton, styles.optionSelected];
    }
    
    return styles.optionButton;
  };

  const getOptionTextStyle = (optionId: string) => {
    const isSelected = answers[currentQuestion.id] === optionId;
    const isCorrect = currentQuestion.options.find(o => o.id === optionId)?.isCorrect;
    const isAnswered = !!answers[currentQuestion.id];

    if (isPracticeMode && isAnswered) {
      if (isSelected && isCorrect) return styles.optionTextCorrect;
      if (isSelected && !isCorrect) return styles.optionTextWrong;
      if (!isSelected && isCorrect) return styles.optionTextCorrect;
    } else {
      if (isSelected) return styles.optionTextSelected;
    }
    
    return styles.optionText;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {!isPracticeMode && (
          <View style={styles.timerContainer}>
            <FontAwesome5 name="clock" size={16} color="#4F46E5" />
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>
        )}
        <Text style={styles.progressText}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <TouchableOpacity onPress={confirmFinish} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Bitir</Text>
        </TouchableOpacity>
      </View>

      {/* Question Area */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {currentQuestion.text}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = answers[currentQuestion.id] === option.id;
            const labels = ['A', 'B', 'C', 'D', 'E'];
            
            return (
              <TouchableOpacity
                key={option.id}
                style={getOptionStyle(option.id)}
                onPress={() => handleAnswer(currentQuestion.id, option.id)}
              >
                <View style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected
                ]}>
                  <Text style={[
                    styles.optionLabelText,
                    isSelected && styles.optionLabelTextSelected
                  ]}>{labels[index]}</Text>
                </View>
                <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((prev) => prev - 1)}
        >
          <FontAwesome5 name="chevron-left" size={16} color={currentIndex === 0 ? '#9CA3AF' : '#4F46E5'} />
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>Önceki</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex((prev) => prev + 1);
            } else {
              confirmFinish();
            }
          }}
        >
          <Text style={styles.navButtonText}>
            {currentIndex === questions.length - 1 ? 'Bitir' : 'Sonraki'}
          </Text>
          <FontAwesome5 
            name={currentIndex === questions.length - 1 ? 'check' : 'chevron-right'} 
            size={16} 
            color="#4F46E5" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  timerText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  finishButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  finishButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    color: '#111827',
    lineHeight: 28,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  optionCorrect: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionLabelSelected: {
    backgroundColor: '#4F46E5',
  },
  optionLabelText: {
    fontWeight: 'bold',
    color: '#6B7280',
  },
  optionLabelTextSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: '#065F46',
    fontWeight: '600',
  },
  optionTextWrong: {
    color: '#991B1B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
