import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, AUTH_URL } from '../../constants/api';
import { useAppTheme } from '../../context/theme-context';

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

interface ProfileSettings {
  showCountdownCard: boolean;
  showAverageAsPercent: boolean;
  notificationsEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  largeTextMode: boolean;
  highContrastMode: boolean;
  themeLock: 'system' | 'light' | 'dark';
}

const PROFILE_SETTINGS_KEY = 'profileSettings';
const DAILY_REMINDER_IDENTIFIER = 'daily-study-reminder';
const EXAM_REMINDER_IDENTIFIERS = [30, 15, 7, 1].map((day) => `exam-reminder-${day}`);
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  showCountdownCard: true,
  showAverageAsPercent: true,
  notificationsEnabled: false,
  dailyReminderHour: 20,
  dailyReminderMinute: 0,
  largeTextMode: false,
  highContrastMode: false,
  themeLock: 'system',
};

if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { activeTheme, setThemeLock } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTargetScore, setEditTargetScore] = useState('');
  const [editExamDate, setEditExamDate] = useState('');
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);

  const ensureNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web' || IS_EXPO_GO) return false;

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return true;
  }, []);

  const cancelAllScheduledNotifications = useCallback(async () => {
    await Promise.all([
      Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_IDENTIFIER).catch(() => null),
      ...EXAM_REMINDER_IDENTIFIERS.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier).catch(() => null)
      ),
    ]);
  }, []);

  const scheduleExamCountdownNotifications = useCallback(async (examDateValue?: string | null) => {
    const sourceDate = examDateValue ? new Date(examDateValue) : null;
    if (!sourceDate || Number.isNaN(sourceDate.getTime())) return;

    sourceDate.setHours(0, 0, 0, 0);
    const now = new Date();

    await Promise.all(
      [30, 15, 7, 1].map(async (day) => {
        const scheduleDate = new Date(sourceDate);
        scheduleDate.setDate(scheduleDate.getDate() - day);
        scheduleDate.setHours(9, 0, 0, 0);

        if (scheduleDate.getTime() <= now.getTime()) return;

        await Notifications.scheduleNotificationAsync({
          identifier: `exam-reminder-${day}`,
          content: {
            title: 'Sınav Hatırlatması',
            body: `Sınava ${day} gün kaldı. Bugün kısa bir tekrar yapmayı unutma.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: scheduleDate,
          },
        });
      })
    );
  }, []);

  const syncNotificationSchedules = useCallback(async (nextSettings: ProfileSettings, examDateValue?: string | null) => {
    if (Platform.OS === 'web') return;

    if (IS_EXPO_GO && nextSettings.notificationsEnabled) {
      const disabledSettings = { ...nextSettings, notificationsEnabled: false };
      setSettings(disabledSettings);
      await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify(disabledSettings));
      Alert.alert('Expo Go Sınırlaması', 'Bildirimler Expo Go içinde çalışmaz. Development Build ile deneyebilirsin.');
      return;
    }

    if (!nextSettings.notificationsEnabled) {
      await cancelAllScheduledNotifications();
      return;
    }

    const granted = await ensureNotificationPermission();
    if (!granted) {
      const disabledSettings = { ...nextSettings, notificationsEnabled: false };
      setSettings(disabledSettings);
      await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify(disabledSettings));
      Alert.alert('Bildirim İzni Gerekli', 'Hatırlatmaları kullanmak için bildirim izni vermelisiniz.');
      await cancelAllScheduledNotifications();
      return;
    }

    await cancelAllScheduledNotifications();

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_IDENTIFIER,
      content: {
        title: 'Günlük Çalışma Zamanı',
        body: 'Ehliyet sınavı için bugün en az 10 soru çözmeyi unutma.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: nextSettings.dailyReminderHour,
        minute: nextSettings.dailyReminderMinute,
      },
    });

    await scheduleExamCountdownNotifications(examDateValue ?? user?.examDate ?? null);
  }, [cancelAllScheduledNotifications, ensureNotificationPermission, scheduleExamCountdownNotifications, user?.examDate]);

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

      let loadedSettings = DEFAULT_PROFILE_SETTINGS;
      const rawSettings = await SecureStore.getItemAsync(PROFILE_SETTINGS_KEY);
      if (rawSettings) {
        try {
          const parsedSettings = JSON.parse(rawSettings) as Partial<ProfileSettings>;
          loadedSettings = {
            showCountdownCard: parsedSettings.showCountdownCard ?? DEFAULT_PROFILE_SETTINGS.showCountdownCard,
            showAverageAsPercent: parsedSettings.showAverageAsPercent ?? DEFAULT_PROFILE_SETTINGS.showAverageAsPercent,
            notificationsEnabled: parsedSettings.notificationsEnabled ?? DEFAULT_PROFILE_SETTINGS.notificationsEnabled,
            dailyReminderHour: parsedSettings.dailyReminderHour ?? DEFAULT_PROFILE_SETTINGS.dailyReminderHour,
            dailyReminderMinute: parsedSettings.dailyReminderMinute ?? DEFAULT_PROFILE_SETTINGS.dailyReminderMinute,
            largeTextMode: parsedSettings.largeTextMode ?? DEFAULT_PROFILE_SETTINGS.largeTextMode,
            highContrastMode: parsedSettings.highContrastMode ?? DEFAULT_PROFILE_SETTINGS.highContrastMode,
            themeLock: parsedSettings.themeLock ?? DEFAULT_PROFILE_SETTINGS.themeLock,
          };
        } catch {
          loadedSettings = DEFAULT_PROFILE_SETTINGS;
        }
      }
      setSettings(loadedSettings);

      setUser(userRes.data);
      setEditName(userRes.data.name || '');
      setEditTargetScore(userRes.data.targetScore?.toString() || '70');
      const dateStr = userRes.data.examDate ? new Date(userRes.data.examDate).toISOString().split('T')[0] : '';
      setEditExamDate(dateStr);
      setResults(resultsRes.data);

      if (loadedSettings.notificationsEnabled) {
        await syncNotificationSchedules(loadedSettings, userRes.data.examDate ?? null);
      }
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router, syncNotificationSchedules]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const updateSetting = async <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    if (key === 'themeLock') {
      await setThemeLock(value as ProfileSettings['themeLock']);
    } else {
      await SecureStore.setItemAsync(PROFILE_SETTINGS_KEY, JSON.stringify(nextSettings));
    }
    if (key === 'notificationsEnabled') {
      await syncNotificationSchedules(nextSettings, user?.examDate ?? null);
    }
  };

  const validateExamDate = (dateValue: string) => {
    const trimmed = dateValue.trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;

    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return undefined;

    const [year, month, day] = trimmed.split('-').map(Number);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() + 1 !== month ||
      parsed.getDate() !== day
    ) {
      return undefined;
    }

    return trimmed;
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    router.replace('/auth/login');
  };

  const handleSaveProfile = async () => {
    try {
      const trimmedName = editName.trim();
      if (trimmedName.length > 0 && trimmedName.length < 2) {
        Alert.alert('Hata', 'Ad Soyad en az 2 karakter olmalı.');
        return;
      }

      const parsedTargetScore = Number.parseInt(editTargetScore, 10);
      if (Number.isNaN(parsedTargetScore) || parsedTargetScore < 0 || parsedTargetScore > 100) {
        Alert.alert('Hata', 'Hedef puan 0 ile 100 arasında olmalı.');
        return;
      }

      const validatedExamDate = validateExamDate(editExamDate);
      if (validatedExamDate === undefined) {
        Alert.alert('Hata', 'Sınav tarihi YYYY-MM-DD formatında olmalı.');
        return;
      }

      if (validatedExamDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDate = new Date(`${validatedExamDate}T00:00:00`);
        if (examDate.getTime() < today.getTime()) {
          Alert.alert('Hata', 'Sınav tarihi geçmiş bir gün olamaz.');
          return;
        }
      }

      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      setSavingProfile(true);

      const response = await axios.put(`${AUTH_URL}/me`, {
        name: trimmedName || null,
        targetScore: parsedTargetScore,
        examDate: validatedExamDate ?? null,
      }, { headers });

      setUser(response.data);
      setModalVisible(false);
      Alert.alert('Başarılı', 'Profil güncellendi!');
      await syncNotificationSchedules(settings, response.data.examDate ?? null);
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setSavingProfile(false);
    }
  };

  const getDaysLeft = () => {
    if (!user?.examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(user.examDate);
    exam.setHours(0, 0, 0, 0);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateStreak = () => {
    if (results.length === 0) return 0;

    const solvedDays = new Set(
      results.map((result) => getDateKey(new Date(result.createdAt)))
    );

    let streakCount = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (solvedDays.has(getDateKey(cursor))) {
      streakCount += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streakCount;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fontScale = settings.largeTextMode ? 1.16 : 1;

  const colors = (() => {
    if (activeTheme === 'dark') {
      if (settings.highContrastMode) {
        return {
          background: '#000000',
          card: '#000000',
          cardAlt: '#111111',
          textPrimary: '#FFFFFF',
          textSecondary: '#E5E7EB',
          divider: '#374151',
          inputBg: '#111111',
          inputBorder: '#FFFFFF',
          accent: '#60A5FA',
          accentSoft: '#1F2937',
          success: '#22C55E',
          danger: '#F87171',
        };
      }
      return {
        background: '#000000',
        card: '#000000',
        cardAlt: '#111111',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
        divider: '#374151',
        inputBg: '#111111',
        inputBorder: '#374151',
        accent: '#818CF8',
        accentSoft: '#1F2937',
        success: '#34D399',
        danger: '#F87171',
      };
    }

    if (settings.highContrastMode) {
      return {
        background: '#FFFFFF',
        card: '#FFFFFF',
        cardAlt: '#FFFFFF',
        textPrimary: '#000000',
        textSecondary: '#111827',
        divider: '#000000',
        inputBg: '#FFFFFF',
        inputBorder: '#000000',
        accent: '#1D4ED8',
        accentSoft: '#DBEAFE',
        success: '#15803D',
        danger: '#B91C1C',
      };
    }

    return {
      background: '#F3F4F6',
      card: '#FFFFFF',
      cardAlt: '#F9FAFB',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      divider: '#E5E7EB',
      inputBg: '#F9FAFB',
      inputBorder: '#E5E7EB',
      accent: '#4F46E5',
      accentSoft: '#EEF2FF',
      success: '#10B981',
      danger: '#EF4444',
    };
  })();

  const fontSize = (value: number) => Math.round(value * fontScale);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const averageScoreValue = results.length > 0
    ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length
    : 0;
  const streak = calculateStreak();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.accentSoft }]}>
            <FontAwesome5 name="user" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.name, { color: colors.textPrimary, fontSize: fontSize(20) }]}>{user?.name || 'Sürücü Adayı'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary, fontSize: fontSize(14) }]}>{user?.email}</Text>
          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.accentSoft }]} onPress={() => setModalVisible(true)}>
            <FontAwesome5 name="edit" size={16} color={colors.accent} />
            <Text style={[styles.editButtonText, { color: colors.accent, fontSize: fontSize(12) }]}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        {user?.examDate && settings.showCountdownCard && (
          <View style={[styles.countdownContainer, { backgroundColor: colors.accent }]}>
            <Text style={[styles.countdownLabel, { fontSize: fontSize(14) }]}>Sınava Kalan</Text>
            <Text style={[styles.countdownValue, { fontSize: fontSize(32) }]}>{getDaysLeft()} Gün</Text>
            <View style={styles.targetContainer}>
              <Text style={[styles.targetText, { fontSize: fontSize(14) }]}>Hedef: {user.targetScore || 70} Puan</Text>
            </View>
          </View>
        )}

        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: fontSize(20) }]}>{results.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Çözülen Test</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: fontSize(20) }]}>
              {settings.showAverageAsPercent ? `%${averageScoreValue.toFixed(1)}` : `${averageScoreValue.toFixed(1)}/100`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Başarı Oranı</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: fontSize(20) }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Gün Serisi</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: fontSize(18) }]}>Son Sınavlar</Text>
        </View>

        {results.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSize(14) }]}>Henüz sınav çözmediniz.</Text>
        ) : (
          results.slice(0, 5).map((result) => (
            <View key={result.id} style={[styles.resultItem, { backgroundColor: colors.card }]}>
              <View>
                <Text style={[styles.resultType, { color: colors.textPrimary, fontSize: fontSize(16) }]}>{result.testType}</Text>
                <Text style={[styles.resultDate, { color: colors.textSecondary, fontSize: fontSize(12) }]}>{new Date(result.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.resultScoreContainer, { backgroundColor: colors.cardAlt }]}>
                <Text
                  style={[
                    styles.resultScore,
                    { color: result.score >= 70 ? colors.success : colors.danger, fontSize: fontSize(14) }
                  ]}
                >
                  {result.score}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: fontSize(18) }]}>Ayarlar</Text>
        </View>
        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Büyük Yazı Modu</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Profil ekranındaki yazıları daha büyük göster</Text>
            </View>
            <Switch
              value={settings.largeTextMode}
              onValueChange={(value) => updateSetting('largeTextMode', value)}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={settings.largeTextMode ? colors.accent : '#F9FAFB'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Yüksek Kontrast</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Metin ve arka plan kontrastını artır</Text>
            </View>
            <Switch
              value={settings.highContrastMode}
              onValueChange={(value) => updateSetting('highContrastMode', value)}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={settings.highContrastMode ? colors.accent : '#F9FAFB'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.settingColumn}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Tema Kilidi</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Sistem, açık veya koyu tema seç</Text>
            </View>
            <View style={[styles.themeModeContainer, { borderColor: colors.divider, backgroundColor: colors.cardAlt }]}>
              <TouchableOpacity
                style={[styles.themeModeButton, settings.themeLock === 'system' && { backgroundColor: colors.accent }]}
                onPress={() => updateSetting('themeLock', 'system')}
              >
                <Text style={[styles.themeModeButtonText, { color: settings.themeLock === 'system' ? '#FFFFFF' : colors.textPrimary, fontSize: fontSize(12) }]}>Sistem</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeModeButton, settings.themeLock === 'light' && { backgroundColor: colors.accent }]}
                onPress={() => updateSetting('themeLock', 'light')}
              >
                <Text style={[styles.themeModeButtonText, { color: settings.themeLock === 'light' ? '#FFFFFF' : colors.textPrimary, fontSize: fontSize(12) }]}>Açık</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeModeButton, settings.themeLock === 'dark' && { backgroundColor: colors.accent }]}
                onPress={() => updateSetting('themeLock', 'dark')}
              >
                <Text style={[styles.themeModeButtonText, { color: settings.themeLock === 'dark' ? '#FFFFFF' : colors.textPrimary, fontSize: fontSize(12) }]}>Koyu</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Günlük Hatırlatma</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Her gün saat 20:00de çalışma bildirimi gönder</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSetting('notificationsEnabled', value)}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={settings.notificationsEnabled ? colors.accent : '#F9FAFB'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Sınav Geri Sayımı</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Profilde sınava kalan gün kartını göster</Text>
            </View>
            <Switch
              value={settings.showCountdownCard}
              onValueChange={(value) => updateSetting('showCountdownCard', value)}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={settings.showCountdownCard ? colors.accent : '#F9FAFB'}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Başarıyı % Olarak Göster</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fontSize(12) }]}>Ortalama puanı yüzde biçiminde göster</Text>
            </View>
            <Switch
              value={settings.showAverageAsPercent}
              onValueChange={(value) => updateSetting('showAverageAsPercent', value)}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={settings.showAverageAsPercent ? colors.accent : '#F9FAFB'}
            />
          </View>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]} onPress={fetchData}>
            <View style={[styles.menuIcon, { backgroundColor: colors.accentSoft }]}>
              <FontAwesome5 name="sync-alt" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.menuText, { color: colors.textPrimary, fontSize: fontSize(16) }]}>Verileri Yenile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: activeTheme === 'dark' ? '#3F1D1D' : '#FEF2F2' }]}>
              <FontAwesome5 name="sign-out-alt" size={20} color={colors.danger} />
            </View>
            <Text style={[styles.menuText, { color: colors.danger, fontSize: fontSize(16) }]}>Çıkış Yap</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: fontSize(20) }]}>Profili Düzenle</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Ad Soyad</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, fontSize: fontSize(16) }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Hedef Puan</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, fontSize: fontSize(16) }]}
              value={editTargetScore}
              onChangeText={setEditTargetScore}
              placeholder="70"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, fontSize: fontSize(14) }]}>Sınav Tarihi (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, fontSize: fontSize(16) }]}
              value={editExamDate}
              onChangeText={setEditExamDate}
              placeholder="2024-12-31"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.cardAlt }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: colors.textPrimary, fontSize: fontSize(14) }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.accent }, savingProfile && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={[styles.saveButtonText, { fontSize: fontSize(14) }]}>{savingProfile ? 'Kaydediliyor...' : 'Kaydet'}</Text>
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
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingColumn: {
    paddingVertical: 14,
    gap: 10,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  themeModeContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    flexDirection: 'row',
    gap: 6,
  },
  themeModeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  themeModeButtonText: {
    fontWeight: '600',
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
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    fontWeight: '600',
    color: '#374151',
  },
  saveButtonText: {
    fontWeight: '600',
    color: 'white',
  },
});
