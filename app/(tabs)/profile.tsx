import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, AUTH_URL } from '../../constants/api';

interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  examDate?: string;
  targetScore?: number;
}

interface ExamResult {
  id: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  testType: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTargetScore, setEditTargetScore] = useState('');
  const [editExamDate, setEditExamDate] = useState(''); // YYYY-MM-DD format for simplicity

  const fetchData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [userRes, resultsRes] = await Promise.all([
        axios.get(`${AUTH_URL}/me`, { headers }),
        axios.get(`${API_BASE_URL}/results`, { headers })
      ]);

      setUser(userRes.data);
      setEditName(userRes.data.name || '');
      setEditTargetScore(userRes.data.targetScore?.toString() || '70');
      // Format date to YYYY-MM-DD for input
      const dateStr = userRes.data.examDate ? new Date(userRes.data.examDate).toISOString().split('T')[0] : '';
      setEditExamDate(dateStr);
      setResults(resultsRes.data);
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired, invalid, or forbidden
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    // Don't delete savedEmail if remember me was used, but we don't know here.
    // Usually logout just clears session token.
    router.replace('/auth/login');
  };

  const handleSaveProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.put(`${AUTH_URL}/me`, {
        name: editName,
        targetScore: editTargetScore,
        examDate: editExamDate || null,
      }, { headers });

      setUser(response.data);
      setModalVisible(false);
      Alert.alert('Başarılı', 'Profil güncellendi!');
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    }
  };

  const getDaysLeft = () => {
    if (!user?.examDate) return null;
    const today = new Date();
    const exam = new Date(user.examDate);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const averageScore = results.length > 0
    ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
    : '0';

  // Calculate streak roughly (simplified for now)
  const streak = 0; // Placeholder

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <FontAwesome5 name="user" size={40} color="#4F46E5" />
          </View>
          <Text style={styles.name}>{user?.name || 'Sürücü Adayı'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
            <FontAwesome5 name="edit" size={16} color="#4F46E5" />
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        {user?.examDate && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Sınava Kalan</Text>
            <Text style={styles.countdownValue}>{getDaysLeft()} Gün</Text>
            <View style={styles.targetContainer}>
               <Text style={styles.targetText}>Hedef: {user.targetScore || 70} Puan</Text>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{results.length}</Text>
            <Text style={styles.statLabel}>Çözülen Test</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>%{averageScore}</Text>
            <Text style={styles.statLabel}>Başarı Oranı</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Gün Serisi</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Sınavlar</Text>
        </View>

        {results.length === 0 ? (
          <Text style={styles.emptyText}>Henüz sınav çözmediniz.</Text>
        ) : (
          results.slice(0, 5).map((result) => (
            <View key={result.id} style={styles.resultItem}>
              <View>
                <Text style={styles.resultType}>{result.testType}</Text>
                <Text style={styles.resultDate}>{new Date(result.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.resultScoreContainer}>
                <Text style={[
                  styles.resultScore, 
                  { color: result.score >= 70 ? '#10B981' : '#EF4444' }
                ]}>
                  {result.score}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
              <FontAwesome5 name="sign-out-alt" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>
            
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ad Soyad"
            />

            <Text style={styles.inputLabel}>Hedef Puan</Text>
            <TextInput
              style={styles.input}
              value={editTargetScore}
              onChangeText={setEditTargetScore}
              placeholder="70"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Sınav Tarihi (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={editExamDate}
              onChangeText={setEditExamDate}
              placeholder="2024-12-31"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveProfile}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 12,
  },
  countdownContainer: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  countdownLabel: {
    color: '#E0E7FF',
    fontSize: 14,
    marginBottom: 4,
  },
  countdownValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  targetContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  targetText: {
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resultType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultScoreContainer: {
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultScore: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 40,
  },
  menuContainer: {
    marginTop: 12,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1F2937',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    marginLeft: 8,
  },
  buttonText: {
    fontWeight: '600',
    color: '#374151', // Default dark for cancel
  },
});
