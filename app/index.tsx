import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        
        if (token) {
          // Token varsa ana sayfaya yönlendir
          router.replace('/(tabs)/home');
        } else {
          // Token yoksa giriş sayfasına yönlendir
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
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
