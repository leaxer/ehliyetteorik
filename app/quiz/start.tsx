import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QuizStartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { categoryId, categoryName, questionCount, examPeriod, mode } = params;
  const resolvedCategoryId = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  const resolvedCategoryName = Array.isArray(categoryName) ? categoryName[0] : categoryName;
  const resolvedExamPeriod = Array.isArray(examPeriod) ? examPeriod[0] : examPeriod;
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const parsedQuestionCount = Number(Array.isArray(questionCount) ? questionCount[0] : questionCount);
  const totalQuestions = Number.isFinite(parsedQuestionCount) && parsedQuestionCount > 0 ? parsedQuestionCount : 50;
  const hasTimer = resolvedMode !== 'practice' && resolvedMode !== 'wrong';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sınav Başlangıç</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name={resolvedExamPeriod ? "calendar-alt" : "book-open"} size={40} color="#4F46E5" />
          </View>
          <Text style={styles.title}>{resolvedCategoryName || resolvedExamPeriod || 'Genel Sınav'}</Text>
          <Text style={styles.subtitle}>
            {resolvedExamPeriod
              ? `Bu sınav ${totalQuestions} soru içermektedir.`
              : `Bu kategori ${totalQuestions} soru içermektedir.`
            }
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <FontAwesome5 name="clock" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{hasTimer ? '45 Dakika' : 'Süre Yok'}</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="question-circle" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{totalQuestions} Soru</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="trophy" size={20} color="#6B7280" />
              <Text style={styles.infoText}>70 Puan Geçer</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => {
            router.replace({
              pathname: '/quiz/exam',
              params: {
                categoryId: resolvedCategoryId,
                categoryName: resolvedCategoryName,
                examPeriod: resolvedExamPeriod,
                mode: resolvedMode,
                questionCount: totalQuestions.toString(),
              }
            });
          }}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.startButtonText}>Sınavı Başlat</Text>
            <FontAwesome5 name="arrow-right" size={20} color="#FFFFFF" />
          </LinearGradient>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  infoItem: {
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
