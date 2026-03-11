import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressCardProps {
  readinessPercent: number;
  avgScore: number;
  targetScore: number;
  daysToExam: number | null;
  totalResults: number;
  wrongPoolCount: number;
}

const getDaysText = (daysToExam: number | null) => {
  if (daysToExam === null) return 'Sınav tarihi girildiğinde geri sayım başlayacak';
  if (daysToExam < 0) return 'Sınav tarihi geçti, yeni tarih belirleyebilirsin';
  if (daysToExam === 0) return 'Bugün sınav günü, başarılar';
  return `Sınava ${daysToExam} gün kaldı`;
};

export const ProgressCard = ({ readinessPercent, avgScore, targetScore, daysToExam, totalResults, wrongPoolCount }: ProgressCardProps) => {
  const progress = Math.max(0, Math.min(100, Math.round(readinessPercent)));
  return (
    <LinearGradient
      colors={['#4F46E5', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.progressCard}
    >
      <View style={styles.progressContent}>
        <View>
          <Text style={styles.progressTitle}>Sınav Hazırlığı</Text>
          <Text style={styles.progressSubtitle}>{`${avgScore} ortalama • Hedef ${targetScore}`}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressPercentage}>{`%${progress}`}</Text>
        </View>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressFooter}>{`${totalResults} deneme • ${wrongPoolCount} yanlış havuzu`}</Text>
      <Text style={styles.progressFooter}>{getDaysText(daysToExam)}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressFooter: {
    fontSize: 13,
    color: '#E0E7FF',
    textAlign: 'right',
  },
});
