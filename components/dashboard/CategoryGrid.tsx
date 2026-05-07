import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Category {
  id: string;
  name: string;
  _count: {
    questions: number;
  };
}

interface CategoryGridProps {
  categories: Category[];
  loading: boolean;
  isDarkTheme?: boolean;
}

const getCategoryStyle = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('trafik') && !lower.includes('adabı')) return { icon: 'traffic-light', color: '#EF4444' };
  if (lower.includes('motor')) return { icon: 'cogs', color: '#F59E0B' };
  if (lower.includes('ilkyardım') || lower.includes('ilk yardım')) return { icon: 'briefcase-medical', color: '#10B981' };
  if (lower.includes('adabı') || lower.includes('adap')) return { icon: 'hands-helping', color: '#3B82F6' };
  return { icon: 'book', color: '#8B5CF6' };
};

export const CategoryGrid = ({ categories, loading, isDarkTheme = false }: CategoryGridProps) => {
  const router = useRouter();
  const colors = isDarkTheme
    ? {
        sectionTitle: '#F9FAFB',
        card: '#111111',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
      }
    : {
        sectionTitle: '#111827',
        card: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
      };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Konu Çalış</Text>
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Konu Çalış</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((cat) => {
          const style = getCategoryStyle(cat.name);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: colors.card }]}
              onPress={() =>
                router.push({
                  pathname: '/quiz/start',
                  params: {
                    categoryId: cat.id,
                    categoryName: cat.name,
                    questionCount: cat._count.questions,
                  },
                })
              }
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${style.color}20` }]}>
                <FontAwesome5 name={style.icon} size={24} color={style.color} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {cat.name}
              </Text>
              <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{cat._count.questions} Soru</Text>
            </TouchableOpacity>
          );
        })}
        {categories.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz kategori bulunamadı.</Text>}
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  categoryCard: {
    width: '47%',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    height: 44,
  },
  categoryCount: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    width: '100%',
    marginTop: 20,
  },
});
