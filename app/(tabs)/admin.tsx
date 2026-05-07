import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, AUTH_URL } from '../../constants/api';

interface Category {
  id: string;
  name: string;
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface AdminQuestionListItem {
  id: string;
  text: string;
  examPeriod: string | null;
  createdAt: string;
  category: Category;
}

interface AdminQuestionDetail {
  id: string;
  text: string;
  examPeriod: string | null;
  imageUrl: string | null;
  explanation: string | null;
  category: Category;
  options: Option[];
}

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [questionText, setQuestionText] = useState('');
  const [examPeriod, setExamPeriod] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [explanation, setExplanation] = useState('');

  const [optionTexts, setOptionTexts] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const [filterText, setFilterText] = useState('');
  const [filterExamPeriod, setFilterExamPeriod] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listItems, setListItems] = useState<AdminQuestionListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);

  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editExamPeriod, setEditExamPeriod] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editOptionTexts, setEditOptionTexts] = useState<string[]>(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const manageAutoLoadedRef = useRef(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const getAuthHeaders = useCallback(async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      const list: Category[] = Array.isArray(response.data)
        ? response.data.map((c: any) => ({ id: c.id, name: c.name }))
        : [];
      setCategories(list);
      setSelectedCategoryId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
      setFilterCategoryId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Hata', 'Kategoriler yüklenirken bir hata oluştu.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchAdminQuestions = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers) {
      router.replace('/auth/login');
      return;
    }

    setListLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/questions`, {
        headers,
        params: {
          q: filterText.trim() || undefined,
          categoryId: filterCategoryId || undefined,
          examPeriod: filterExamPeriod.trim() || undefined,
          take: 50,
          skip: 0,
        },
      });

      const items: AdminQuestionListItem[] = Array.isArray(res.data?.items) ? res.data.items : [];
      setListItems(items);
      setListTotal(typeof res.data?.total === 'number' ? res.data.total : items.length);
    } catch (error: any) {
      console.error('Fetch admin questions error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
        return;
      }
      Alert.alert('Hata', error.response?.data?.message || 'Sorular yüklenemedi.');
    } finally {
      setListLoading(false);
    }
  }, [filterCategoryId, filterExamPeriod, filterText, getAuthHeaders, router]);

  const closeEdit = useCallback(() => {
    setEditingQuestionId(null);
    setEditCategoryId(null);
    setEditText('');
    setEditExamPeriod('');
    setEditImageUrl('');
    setEditExplanation('');
    setEditOptionTexts(['', '', '', '']);
    setEditCorrectIndex(0);
  }, []);

  const openEditQuestion = useCallback(
    async (id: string) => {
      const headers = await getAuthHeaders();
      if (!headers) {
        router.replace('/auth/login');
        return;
      }

      setEditingQuestionId(id);
      setEditLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/admin/questions/${id}`, { headers });
        const q: AdminQuestionDetail = res.data;
        setEditCategoryId(q.category?.id || null);
        setEditText(q.text || '');
        setEditExamPeriod(q.examPeriod || '');
        setEditImageUrl(q.imageUrl || '');
        setEditExplanation(q.explanation || '');

        const sorted = Array.isArray(q.options) ? q.options.slice() : [];
        const texts = ['', '', '', ''];
        sorted.slice(0, 4).forEach((o, idx) => {
          texts[idx] = o.text || '';
        });
        setEditOptionTexts(texts);

        const correctIdx = sorted.findIndex((o) => o.isCorrect);
        setEditCorrectIndex(correctIdx >= 0 && correctIdx < 4 ? correctIdx : 0);
      } catch (error: any) {
        console.error('Open edit question error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          await SecureStore.deleteItemAsync('userToken');
          router.replace('/auth/login');
          return;
        }
        Alert.alert('Hata', error.response?.data?.message || 'Soru bilgisi alınamadı.');
        setEditingQuestionId(null);
      } finally {
        setEditLoading(false);
      }
    },
    [getAuthHeaders, router]
  );

  const saveEditedQuestion = useCallback(async () => {
    if (!editingQuestionId) return;

    const text = editText.trim();
    if (!text) {
      Alert.alert('Uyarı', 'Soru metni boş olamaz.');
      return;
    }

    if (!editCategoryId) {
      Alert.alert('Uyarı', 'Kategori seçiniz.');
      return;
    }

    const normalizedOptions = editOptionTexts.map((t) => t.trim());
    if (normalizedOptions.some((t) => !t)) {
      Alert.alert('Uyarı', 'Tüm şıkları doldurun.');
      return;
    }

    const headers = await getAuthHeaders();
    if (!headers) {
      router.replace('/auth/login');
      return;
    }

    try {
      setEditSaving(true);
      await axios.put(
        `${API_BASE_URL}/admin/questions/${editingQuestionId}`,
        {
          text,
          categoryId: editCategoryId,
          examPeriod: editExamPeriod.trim() || null,
          imageUrl: editImageUrl.trim() || null,
          explanation: editExplanation.trim() || null,
          options: normalizedOptions.map((t, index) => ({ text: t, isCorrect: index === editCorrectIndex })),
        },
        { headers }
      );

      Alert.alert('Başarılı', 'Soru güncellendi.');
      await fetchAdminQuestions();
    } catch (error: any) {
      console.error('Save edited question error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
        return;
      }
      Alert.alert('Hata', error.response?.data?.message || 'Soru güncellenemedi.');
    } finally {
      setEditSaving(false);
    }
  }, [
    editCategoryId,
    editCorrectIndex,
    editExamPeriod,
    editExplanation,
    editImageUrl,
    editOptionTexts,
    editText,
    editingQuestionId,
    fetchAdminQuestions,
    getAuthHeaders,
    router,
  ]);

  const deleteQuestion = useCallback(
    async (id: string) => {
      const headers = await getAuthHeaders();
      if (!headers) {
        router.replace('/auth/login');
        return;
      }

      Alert.alert('Silinsin mi?', 'Bu soruyu silmek istediğinize emin misiniz?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/admin/questions/${id}`, { headers });
              if (editingQuestionId === id) closeEdit();
              await fetchAdminQuestions();
            } catch (error: any) {
              console.error('Delete question error:', error);
              Alert.alert('Hata', error.response?.data?.message || 'Soru silinemedi.');
            }
          },
        },
      ]);
    },
    [closeEdit, editingQuestionId, fetchAdminQuestions, getAuthHeaders, router]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          router.replace('/auth/login');
          return;
        }

        const meRes = await axios.get(`${AUTH_URL}/me`, { headers });
        const admin = Boolean(meRes.data?.isAdmin);
        setIsAdmin(admin);
        if (admin) {
          await fetchCategories();
        }
      } catch (error: any) {
        console.error('Admin init error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          await SecureStore.deleteItemAsync('userToken');
          router.replace('/auth/login');
          return;
        }
        Alert.alert('Hata', 'Gerekli bilgiler alınamadı.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchCategories, getAuthHeaders, router]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab !== 'manage') {
      manageAutoLoadedRef.current = false;
      return;
    }
    if (manageAutoLoadedRef.current) return;
    manageAutoLoadedRef.current = true;
    fetchAdminQuestions();
  }, [activeTab, fetchAdminQuestions, isAdmin]);

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('Uyarı', 'Kategori adı boş olamaz.');
      return;
    }

    const headers = await getAuthHeaders();
    if (!headers) {
      router.replace('/auth/login');
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post(`${API_BASE_URL}/admin/categories`, { name }, { headers });
      await fetchCategories();
      setSelectedCategoryId(res.data?.id || null);
      setNewCategoryName('');
      Alert.alert('Başarılı', 'Kategori oluşturuldu.');
    } catch (error: any) {
      console.error('Create category error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Kategori oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const saveQuestion = async () => {
    const text = questionText.trim();
    if (!text) {
      Alert.alert('Uyarı', 'Soru metni boş olamaz.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Uyarı', 'Kategori seçiniz.');
      return;
    }

    const normalizedOptions = optionTexts.map((t) => t.trim());
    if (normalizedOptions.some((t) => !t)) {
      Alert.alert('Uyarı', 'Tüm şıkları doldurun.');
      return;
    }

    const headers = await getAuthHeaders();
    if (!headers) {
      router.replace('/auth/login');
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${API_BASE_URL}/admin/questions`,
        {
          text,
          categoryId: selectedCategoryId,
          examPeriod: examPeriod.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          explanation: explanation.trim() || undefined,
          options: normalizedOptions.map((t, index) => ({ text: t, isCorrect: index === correctIndex })),
        },
        { headers }
      );

      setQuestionText('');
      setExamPeriod('');
      setImageUrl('');
      setExplanation('');
      setOptionTexts(['', '', '', '']);
      setCorrectIndex(0);
      Alert.alert('Başarılı', 'Soru eklendi.');
    } catch (error: any) {
      console.error('Create question error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Soru eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.title}>Admin Paneli</Text>
          <Text style={styles.subtitle}>Bu sayfaya erişim yetkiniz yok.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.primaryButtonText}>Ana Sayfa</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Admin Paneli</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
            onPress={() => setActiveTab('create')}
            disabled={saving || editSaving}
          >
            <Text style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}>Soru Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'manage' && styles.tabButtonActive]}
            onPress={() => setActiveTab('manage')}
            disabled={saving || editSaving}
          >
            <Text style={[styles.tabButtonText, activeTab === 'manage' && styles.tabButtonTextActive]}>Sorular</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'create' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Kategori</Text>

              {categoriesLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : categories.length === 0 ? (
                <Text style={styles.emptyText}>Henüz kategori yok.</Text>
              ) : (
                <View style={styles.categoryWrap}>
                  {categories.map((c) => {
                    const active = c.id === selectedCategoryId;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCategoryId(c.id)}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        disabled={saving}
                      >
                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Yeni kategori adı"
                  editable={!saving}
                />
                <TouchableOpacity style={styles.secondaryButton} onPress={createCategory} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Oluştur</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.selectedText}>Seçili: {selectedCategory?.name || '-'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Soru</Text>

              <Text style={styles.label}>Soru Metni</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={questionText}
                onChangeText={setQuestionText}
                placeholder="Soruyu buraya yazın"
                multiline
                editable={!saving}
              />

              <Text style={styles.label}>Dönem (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                value={examPeriod}
                onChangeText={setExamPeriod}
                placeholder="?rn: 2024 A?ustos"
                editable={!saving}
              />

              <Text style={styles.label}>Görsel URL (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                autoCapitalize="none"
                editable={!saving}
              />

              <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={explanation}
                onChangeText={setExplanation}
                placeholder="Açıklama"
                multiline
                editable={!saving}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Şıklar</Text>

              {optionTexts.map((value, index) => {
                const labels = ['A', 'B', 'C', 'D'];
                const isCorrect = correctIndex === index;
                return (
                  <View key={index} style={styles.optionRow}>
                    <TouchableOpacity
                      style={[styles.correctToggle, isCorrect && styles.correctToggleActive]}
                      onPress={() => setCorrectIndex(index)}
                      disabled={saving}
                    >
                      <Text style={[styles.correctToggleText, isCorrect && styles.correctToggleTextActive]}>{labels[index]}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={value}
                      onChangeText={(text) => {
                        setOptionTexts((prev) => prev.map((p, i) => (i === index ? text : p)));
                      }}
                      placeholder={`${labels[index]} şıkkı`}
                      editable={!saving}
                    />
                  </View>
                );
              })}

              <TouchableOpacity style={styles.primaryButton} onPress={saveQuestion} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Soruyu Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Filtre</Text>

              <Text style={styles.label}>Arama</Text>
              <TextInput
                style={styles.input}
                value={filterText}
                onChangeText={setFilterText}
                placeholder="Soru metni veya açıklama"
                editable={!listLoading && !editSaving}
              />

              <Text style={styles.label}>Dönem</Text>
              <TextInput
                style={styles.input}
                value={filterExamPeriod}
                onChangeText={setFilterExamPeriod}
                placeholder="?rn: 2024 A?ustos"
                editable={!listLoading && !editSaving}
              />

              <Text style={styles.label}>Kategori</Text>
              {categoriesLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : categories.length === 0 ? (
                <Text style={styles.emptyText}>Henüz kategori yok.</Text>
              ) : (
                <View style={styles.categoryWrap}>
                  {categories.map((c) => {
                    const active = c.id === filterCategoryId;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setFilterCategoryId(c.id)}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        disabled={listLoading || editSaving}
                      >
                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.row}>
                <TouchableOpacity style={styles.secondaryButton} onPress={fetchAdminQuestions} disabled={listLoading || editSaving}>
                  <Text style={styles.secondaryButtonText}>Listele</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <Text style={styles.selectedText}>Toplam: {listTotal}</Text>
              </View>
            </View>

            {editingQuestionId ? (
              <View style={styles.card}>
                <View style={styles.editHeaderRow}>
                  <Text style={styles.sectionTitle}>Soru Düzenle</Text>
                  <TouchableOpacity style={styles.linkButton} onPress={closeEdit} disabled={editSaving}>
                    <Text style={styles.linkButtonText}>Kapat</Text>
                  </TouchableOpacity>
                </View>

                {editLoading ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Text style={styles.label}>Kategori</Text>
                    <View style={styles.categoryWrap}>
                      {categories.map((c) => {
                        const active = c.id === editCategoryId;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setEditCategoryId(c.id)}
                            style={[styles.categoryChip, active && styles.categoryChipActive]}
                            disabled={editSaving}
                          >
                            <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Soru Metni</Text>
                    <TextInput
                      style={[styles.input, styles.multiline]}
                      value={editText}
                      onChangeText={setEditText}
                      placeholder="Soruyu buraya yazın"
                      multiline
                      editable={!editSaving}
                    />

                    <Text style={styles.label}>Dönem</Text>
                    <TextInput
                      style={styles.input}
                      value={editExamPeriod}
                      onChangeText={setEditExamPeriod}
                      placeholder="?rn: 2024 A?ustos"
                      editable={!editSaving}
                    />

                    <Text style={styles.label}>Görsel URL</Text>
                    <TextInput
                      style={styles.input}
                      value={editImageUrl}
                      onChangeText={setEditImageUrl}
                      placeholder="https://..."
                      autoCapitalize="none"
                      editable={!editSaving}
                    />

                    <Text style={styles.label}>Açıklama</Text>
                    <TextInput
                      style={[styles.input, styles.multiline]}
                      value={editExplanation}
                      onChangeText={setEditExplanation}
                      placeholder="Açıklama"
                      multiline
                      editable={!editSaving}
                    />

                    <Text style={styles.sectionTitle}>Şıklar</Text>
                    {editOptionTexts.map((value, index) => {
                      const labels = ['A', 'B', 'C', 'D'];
                      const isCorrect = editCorrectIndex === index;
                      return (
                        <View key={index} style={styles.optionRow}>
                          <TouchableOpacity
                            style={[styles.correctToggle, isCorrect && styles.correctToggleActive]}
                            onPress={() => setEditCorrectIndex(index)}
                            disabled={editSaving}
                          >
                            <Text style={[styles.correctToggleText, isCorrect && styles.correctToggleTextActive]}>{labels[index]}</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={value}
                            onChangeText={(text) => {
                              setEditOptionTexts((prev) => prev.map((p, i) => (i === index ? text : p)));
                            }}
                            placeholder={`${labels[index]} şıkkı`}
                            editable={!editSaving}
                          />
                        </View>
                      );
                    })}

                    <View style={styles.row}>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => deleteQuestion(editingQuestionId)} disabled={editSaving}>
                        <Text style={styles.dangerButtonText}>Sil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryButtonInline} onPress={saveEditedQuestion} disabled={editSaving}>
                        {editSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Kaydet</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sorular</Text>

              {listLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : listItems.length === 0 ? (
                <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {listItems.map((q) => (
                    <View key={q.id} style={styles.questionRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questionMeta}>
                          {q.category?.name || '-'}
                          {q.examPeriod ? ` ⬢ ${q.examPeriod}` : ''}
                        </Text>
                        <Text style={styles.questionText} numberOfLines={3}>
                          {q.text}
                        </Text>
                      </View>
                      <View style={styles.questionActions}>
                        <TouchableOpacity
                          style={styles.secondaryButtonSmall}
                          onPress={() => openEditQuestion(q.id)}
                          disabled={editSaving || listLoading}
                        >
                          <Text style={styles.secondaryButtonText}>Düzenle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryButtonSmall}
                          onPress={() => deleteQuestion(q.id)}
                          disabled={editSaving || listLoading}
                        >
                          <Text style={styles.dangerButtonText}>Sil</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  tabButtonText: {
    color: '#374151',
    fontWeight: '800',
  },
  tabButtonTextActive: {
    color: '#4F46E5',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#111827',
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#4F46E5',
  },
  selectedText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  correctToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctToggleActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  correctToggleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
  correctToggleTextActive: {
    color: '#10B981',
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  linkButtonText: {
    color: '#374151',
    fontWeight: '800',
    fontSize: 13,
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  questionRow: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  questionMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  questionText: {
    marginTop: 6,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  questionActions: {
    gap: 8,
    justifyContent: 'center',
  },
  secondaryButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
});

