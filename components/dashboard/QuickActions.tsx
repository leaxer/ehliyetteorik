import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const QuickActions = () => {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/practice')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
            <FontAwesome5 name="play" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.quickActionText}>Deneme Sınavı</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() =>
            router.push({
              pathname: '/quiz/exam',
              params: { mode: 'wrong', categoryName: 'Yanlışlarım' },
            })
          }
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEF2F2' }]}>
            <FontAwesome5 name="exclamation-triangle" size={20} color="#EF4444" />
          </View>
          <Text style={styles.quickActionText}>Yanlışlarım</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(tabs)/ai')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
            <FontAwesome5 name="robot" size={20} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>AI Asistan</Text>
        </TouchableOpacity>
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
