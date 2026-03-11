import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ExamPeriodListProps {
  periods: { examPeriod: string; questionCount: number }[];
  loading: boolean;
}

export const ExamPeriodList = ({ periods, loading }: ExamPeriodListProps) => {
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Çıkmış Sınav Soruları</Text>
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Çıkmış Sınav Soruları</Text>
      <View style={styles.grid}>
        {periods.map((period) => (
          <TouchableOpacity 
            key={period.examPeriod}
            style={styles.card}
            onPress={() => router.push({ 
              pathname: '/quiz/start', 
              params: { 
                examPeriod: period.examPeriod,
                categoryName: period.examPeriod,
                questionCount: period.questionCount.toString(),
              } 
            })}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="calendar-alt" size={20} color="#4F46E5" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{period.examPeriod}</Text>
              <Text style={styles.countText}>{period.questionCount} Soru</Text>
            </View>
            <View style={styles.arrowContainer}>
              <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
        {periods.length === 0 && (
          <Text style={styles.emptyText}>
            Henüz çıkmış sınav bulunamadı.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  countText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 10,
  },
});
