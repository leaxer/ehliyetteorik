import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryGrid } from '../../components/dashboard/CategoryGrid';
import { ExamPeriodList } from '../../components/dashboard/ExamPeriodList';
import { ProgressCard } from '../../components/dashboard/ProgressCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { API_BASE_URL } from '../../constants/api';

interface Category {
  id: string;
  name: string;
  _count: {
    questions: number;
  };
}

interface ExamPeriod {
  examPeriod: string;
  questionCount: number;
}

interface PreparationSummary {
  userName: string | null;
  targetScore: number;
  avgScore: number;
  readinessPercent: number;
  totalResults: number;
  wrongPoolCount: number;
  daysToExam: number | null;
}

interface WeakTopic {
  categoryId: string;
  categoryName: string;
  wrongCount: number;
  questionCount: number;
  lastWrongAt: string;
  priorityScore: number;
  priorityLevel: 'Yüksek' | 'Orta' | 'Düşük';
}

const getPriorityStyles = (priorityLevel: WeakTopic['priorityLevel']) => {
  if (priorityLevel === 'Yüksek') {
    return {
      badge: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
      text: { color: '#991B1B' },
      icon: { name: 'exclamation-circle' as const, color: '#DC2626' },
      label: 'Yüksek',
    };
  }
  if (priorityLevel === 'Orta') {
    return {
      badge: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
      text: { color: '#92400E' },
      icon: { name: 'minus-circle' as const, color: '#D97706' },
      label: 'Orta',
    };
  }
  return {
    badge: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
    text: { color: '#166534' },
    icon: { name: 'check-circle' as const, color: '#16A34A' },
    label: 'Düşük',
  };
};

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
  const [summary, setSummary] = useState<PreparationSummary>({
    userName: null,
    targetScore: 70,
    avgScore: 0,
    readinessPercent: 0,
    totalResults: 0,
    wrongPoolCount: 0,
    daysToExam: null,
  });
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [categoriesRes, periodsRes, summaryRes, weakTopicsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories`),
        axios.get(`${API_BASE_URL}/exam-periods`),
        token
          ? axios.get(`${API_BASE_URL}/results/preparation-summary`, { headers })
          : Promise.resolve({ data: null }),
        token
          ? axios.get(`${API_BASE_URL}/results/weak-topics`, { headers })
          : Promise.resolve({ data: [] }),
      ]);
      setCategories(categoriesRes.data);
      setExamPeriods(periodsRes.data);
      if (summaryRes.data) {
        setSummary(summaryRes.data);
      }
      setWeakTopics(Array.isArray(weakTopicsRes.data) ? weakTopicsRes.data : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{`Merhaba, ${summary.userName || 'Sürücü Adayı'} 👋`}</Text>
            <Text style={styles.subtitle}>Bugün ne çalışmak istersin?</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatarContainer}>
              <FontAwesome5 name="user" size={20} color="#4F46E5" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Components */}
        <ProgressCard
          readinessPercent={summary.readinessPercent}
          avgScore={summary.avgScore}
          targetScore={summary.targetScore}
          daysToExam={summary.daysToExam}
          totalResults={summary.totalResults}
          wrongPoolCount={summary.wrongPoolCount}
        />
        {weakTopics.length > 0 && (
          <View style={styles.weakTopicsSection}>
            <Text style={styles.weakTopicsTitle}>Zayıf Konularım</Text>
            {weakTopics.map((topic) => {
              const priorityStyle = getPriorityStyles(topic.priorityLevel);
              return (
                <View key={topic.categoryId} style={styles.weakTopicCard}>
                  <View style={styles.weakTopicLeft}>
                    <View style={styles.weakTopicHeaderRow}>
                      <Text style={styles.weakTopicName}>{topic.categoryName}</Text>
                      <View style={[styles.priorityBadge, priorityStyle.badge]}>
                        <FontAwesome5 name={priorityStyle.icon.name} size={11} color={priorityStyle.icon.color} />
                        <Text style={[styles.priorityBadgeText, priorityStyle.text]}>{priorityStyle.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.weakTopicMeta}>{`${topic.wrongCount} yanlış • ${topic.questionCount} soru`}</Text>
                    <View style={styles.weakTopicActionsRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionButton}
                        onPress={() =>
                          router.push({
                            pathname: '/quiz/exam',
                            params: {
                              categoryId: topic.categoryId,
                              categoryName: topic.categoryName,
                              mode: 'practice',
                            },
                          })
                        }
                      >
                        <Text style={styles.secondaryActionText}>Konu Çalış</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() =>
                          router.push({
                            pathname: '/quiz/exam',
                            params: {
                              categoryId: topic.categoryId,
                              categoryName: topic.categoryName,
                              mode: 'adaptive',
                              questionCount: '10',
                            },
                          })
                        }
                      >
                        <FontAwesome5 name="play" size={11} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>10 Soru Çöz</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <QuickActions />
        <CategoryGrid categories={categories} loading={loading} />
        <ExamPeriodList periods={examPeriods} loading={loading} />
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  weakTopicsSection: {
    marginBottom: 24,
  },
  weakTopicsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  weakTopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  weakTopicLeft: {
    flex: 1,
  },
  weakTopicName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    paddingRight: 8,
  },
  weakTopicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weakTopicMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weakTopicActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#4F46E5',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
