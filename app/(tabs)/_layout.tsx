import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AUTH_URL } from '../../constants/api';
import { useAppTheme } from '../../context/theme-context';

export default function TabLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { isDarkTheme } = useAppTheme();

  useEffect(() => {
    let isMounted = true;

    const loadUserRole = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
          if (isMounted) {
            setIsAdmin(false);
            setCheckingAccess(false);
          }
          router.replace('/auth/login');
          return;
        }

        const response = await axios.get(`${AUTH_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const onboardingCompleted = Boolean(response.data?.onboardingCompleted);
        if (isMounted) {
          setIsAdmin(Boolean(response.data?.isAdmin));
          setCheckingAccess(false);
        }

        if (!onboardingCompleted) {
          router.replace('/onboarding');
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
          setCheckingAccess(false);
        }
        router.replace('/auth/login');
      }
    };

    loadUserRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingAccess) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkTheme ? '#000000' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color={isDarkTheme ? '#FFFFFF' : '#4F46E5'} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDarkTheme ? '#1F2937' : '#f3f4f6',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: isDarkTheme ? '#FFFFFF' : '#4F46E5',
        tabBarInactiveTintColor: isDarkTheme ? '#6B7280' : '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Çalış',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="book-open" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Asistan',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="robot" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="tools" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
