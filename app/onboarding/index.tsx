import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AUTH_URL } from '../../constants/api';

const LICENSE_CLASS_OPTIONS = ['A1', 'A2', 'A', 'B', 'C', 'D', 'E', 'F', 'M'] as const;
type LicenseClass = (typeof LICENSE_CLASS_OPTIONS)[number];

type OnboardingStep = 0 | 1 | 2;

interface MeResponse {
  examDate?: string | null;
  targetScore?: number | null;
  licenseClass?: string | null;
  onboardingCompleted?: boolean;
}

const toApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);

export default function OnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(0);

  const [examDate, setExamDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [targetScore, setTargetScore] = useState('70');
  const [licenseClass, setLicenseClass] = useState<LicenseClass | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
          router.replace('/auth/login');
          return;
        }

        const response = await axios.get<MeResponse>(`${AUTH_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!active) return;

        if (response.data?.onboardingCompleted) {
          router.replace('/(tabs)/home');
          return;
        }

        if (response.data?.examDate) {
          const parsedDate = new Date(response.data.examDate);
          if (!Number.isNaN(parsedDate.getTime())) {
            setExamDate(parsedDate);
          }
        }
        if (typeof response.data?.targetScore === 'number') {
          setTargetScore(String(response.data.targetScore));
        }
        if (response.data?.licenseClass) {
          const normalized = response.data.licenseClass.toUpperCase();
          if (LICENSE_CLASS_OPTIONS.includes(normalized as LicenseClass)) {
            setLicenseClass(normalized as LicenseClass);
          }
        }
      } catch (error) {
        console.error('Onboarding bootstrap failed:', error);
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
        return;
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const steps = useMemo(
    () => [
      {
        title: 'Sınav Tarihi',
        subtitle: 'Hedef sınav tarihini seç',
      },
      {
        title: 'Hedef Puan',
        subtitle: 'Sınavda almak istediğin puanı belirle',
      },
      {
        title: 'Ehliyet Sınıfı',
        subtitle: 'Hazırlandığın sınıfı seç',
      },
    ],
    []
  );

  const validateStep = (currentStep: OnboardingStep): boolean => {
    if (currentStep === 0) {
      if (!examDate) {
        Alert.alert('Eksik Bilgi', 'Sınav tarihini seçmelisin.');
        return false;
      }
      return true;
    }

    if (currentStep === 1) {
      const parsedTarget = Number(targetScore.trim());
      if (!Number.isInteger(parsedTarget) || parsedTarget < 1 || parsedTarget > 100) {
        Alert.alert('Geçersiz Hedef', 'Hedef puan 1 ile 100 arasında olmalı.');
        return false;
      }
      return true;
    }

    if (!licenseClass) {
      Alert.alert('Eksik Bilgi', 'Ehliyet sınıfı seçmelisin.');
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (step < 2) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    }
  };

  const previousStep = () => {
    if (step > 0) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      setExamDate(selectedDate);
    }
  };

  const completeOnboarding = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !examDate) return;

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      await axios.put(
        `${AUTH_URL}/me`,
        {
          examDate: toApiDate(examDate),
          targetScore: Number(targetScore.trim()),
          licenseClass,
          onboardingCompleted: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Onboarding save failed:', error);
      Alert.alert('Hata', error?.response?.data?.message || 'Bilgiler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {steps.map((_, index) => (
          <View key={index} style={[styles.progressDot, index <= step ? styles.progressDotActive : styles.progressDotPassive]} />
        ))}
      </View>

      <Text style={styles.stepCounter}>{`Adım ${step + 1} / ${steps.length}`}</Text>
      <Text style={styles.title}>{steps[step].title}</Text>
      <Text style={styles.subtitle}>{steps[step].subtitle}</Text>

      {step === 0 ? (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Sınav Tarihi</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{examDate ? formatDisplayDate(examDate) : 'Tarih seç'}</Text>
          </TouchableOpacity>

          {showDatePicker ? (
            <DateTimePicker
              value={examDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          ) : null}
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Hedef Puan</Text>
          <TextInput
            style={styles.input}
            value={targetScore}
            onChangeText={setTargetScore}
            placeholder="Örn: 85"
            keyboardType="number-pad"
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Ehliyet Sınıfı</Text>
          <View style={styles.licenseGrid}>
            {LICENSE_CLASS_OPTIONS.map((option) => {
              const selected = licenseClass === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.licenseChip, selected && styles.licenseChipSelected]}
                  onPress={() => setLicenseClass(option)}
                >
                  <Text style={[styles.licenseChipText, selected && styles.licenseChipTextSelected]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.secondaryButton, step === 0 && styles.hiddenButton]} onPress={previousStep} disabled={step === 0}>
          <Text style={styles.secondaryButtonText}>Geri</Text>
        </TouchableOpacity>

        {step < 2 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>İleri</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={completeOnboarding} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Tamamla</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  progressDotActive: {
    backgroundColor: '#4F46E5',
  },
  progressDotPassive: {
    backgroundColor: '#E5E7EB',
  },
  stepCounter: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
  },
  inputSection: {
    marginTop: 36,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  licenseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  licenseChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 72,
    alignItems: 'center',
  },
  licenseChipSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  licenseChipText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
  },
  licenseChipTextSelected: {
    color: '#4F46E5',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  hiddenButton: {
    opacity: 0,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
});