import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AUTH_URL } from '../constants/api';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');

        if (!token) {
          router.replace('/auth/login');
          return;
        }

        const meResponse = await axios.get(`${AUTH_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const onboardingCompleted = Boolean(meResponse.data?.onboardingCompleted);
        router.replace(onboardingCompleted ? '/(tabs)/home' : '/onboarding');
      } catch (error) {
        console.error('Auth check failed:', error);
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}