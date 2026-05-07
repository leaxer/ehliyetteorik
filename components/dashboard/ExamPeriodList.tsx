import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ExamPeriodListProps {
  periods: { examPeriod: string; questionCount: number }[];
  loading: boolean;
  isDarkTheme?: boolean;
}

export const ExamPeriodList = ({ periods, loading, isDarkTheme = false }: ExamPeriodListProps) => {
  const router = useRouter();
  const colors = isDarkTheme
    ? {
        sectionTitle: '#F9FAFB',
        card: '#111111',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
        iconBg: '#1F2937',
      }
    : {
        sectionTitle: '#111827',
        card: '#FFFFFF',
        textPrimary: '#1F2937',
        textSecondary: '#6B7280',
        iconBg: '#EEF2FF',
      };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Çıkmış Sınav Soruları</Text>
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Çıkmış Sınav Soruları</Text>
      <View style={styles.grid}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.examPeriod}
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() =>
              router.push({
                pathname: '/quiz/start',
                params: {
                  examPeriod: period.examPeriod,
                  categoryName: period.examPeriod,
                  questionCount: period.questionCount.toString(),
                },
              })
            }
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
              <FontAwesome5 name="calendar-alt" size={20} color="#4F46E5" />
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{period.examPeriod}</Text>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>{period.questionCount} Soru</Text>
            </View>
            <View style={styles.arrowContainer}>
              <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
        {periods.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz çıkmış sınav bulunamadı.</Text>}
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
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  countText: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
  },
});
