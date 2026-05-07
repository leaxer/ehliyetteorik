import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../constants/api';
import { useAppTheme } from '../../context/theme-context';

interface Category {
  id: string;
  name: string;
  _count: {
    questions: number;
  };
}

export default function PracticeScreen() {
  const router = useRouter();
  const { isDarkTheme } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = isDarkTheme
    ? {
        background: '#000000',
        headerBg: '#111111',
        headerBorder: '#1F2937',
        card: '#111111',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
        accentSoft: '#1F2937',
      }
    : {
        background: '#F9FAFB',
        headerBg: '#FFFFFF',
        headerBorder: '#F3F4F6',
        card: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        accentSoft: '#EEF2FF',
      };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const startAdaptiveExam = useCallback(async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    router.push({
      pathname: '/quiz/exam',
      params: {
        mode: 'adaptive',
        categoryName: 'Adaptif Deneme',
        questionCount: '50',
      },
    });
  }, [router]);

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('trafik')) return { icon: 'traffic-light', color: '#EF4444' };
    if (lowerName.includes('motor')) return { icon: 'cogs', color: '#F59E0B' };
    if (lowerName.includes('ilkyardım') || lowerName.includes('ilk yardım')) return { icon: 'briefcase-medical', color: '#10B981' };
    if (lowerName.includes('adap') || lowerName.includes('adabı')) return { icon: 'user-friends', color: '#8B5CF6' };
    return { icon: 'book', color: '#4F46E5' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Çalışma Alanı</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Kendini dene ve eksiklerini gör (Süre Yok)</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDarkTheme ? '#FFFFFF' : '#4F46E5'} />}
      >
        <TouchableOpacity style={[styles.adaptiveCard, { backgroundColor: colors.card, borderColor: isDarkTheme ? '#374151' : '#E0E7FF' }]} onPress={startAdaptiveExam}>
          <View style={[styles.adaptiveIcon, { backgroundColor: colors.accentSoft }]}>
            <FontAwesome5 name="chart-line" size={18} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.adaptiveTitle, { color: colors.textPrimary }]}>Adaptif Deneme</Text>
            <Text style={[styles.adaptiveDesc, { color: colors.textSecondary }]}>Yanlışlarına göre sana özel 50 soru</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : categories.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz kategori bulunamadı.</Text>
        ) : (
          categories.map((category) => {
            const { icon, color } = getCategoryIcon(category.name);
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() =>
                  router.push({
                    pathname: '/quiz/exam',
                    params: {
                      categoryId: category.id,
                      categoryName: category.name,
                      mode: 'practice',
                    },
                  })
                }
              >
                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                  <FontAwesome5 name={icon} size={24} color={color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{category.name}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{category._count.questions} Soru</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adaptiveCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  adaptiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adaptiveTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  adaptiveDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
});
