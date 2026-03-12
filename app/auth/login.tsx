import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AUTH_URL } from '../../constants/api';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 30;
const PASSWORD_LETTER_REGEX = /[A-Za-zÇĞİÖŞÜçğıöşü]/;

const isPasswordValidByPolicy = (value: string) => {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  return PASSWORD_LETTER_REGEX.test(value);
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a saved email
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('savedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.log('Error loading saved email:', error);
      }
    };
    loadSavedEmail();
  }, []);

  const handleLogin = async () => {
    if (!isPasswordValidByPolicy(password)) {
      Alert.alert('Hata', `Şifre ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} karakter olmalı ve en az bir harf içermelidir.`);
      return;
    }

    try {
      const response = await axios.post(`${AUTH_URL}/login`, { email, password });
      const { token } = response.data;
      
      Alert.alert('Başarılı', 'Giriş başarılı!');
      
      // Save token if remember me is checked, or always save it for session?
      // Usually we save token for session. "Remember Me" might be for persistent login across app restarts.
      // For this app, let's save token always for session, but "Remember Me" controls if we keep it long term?
      // Simpler approach: Always save token for auth, but "Remember Me" saves the email for next time.
      // OR: "Remember Me" means "Keep me logged in".
      
      await SecureStore.setItemAsync('userToken', token);
      
      if (rememberMe) {
        await SecureStore.setItemAsync('savedEmail', email);
      } else {
        await SecureStore.deleteItemAsync('savedEmail');
      }

      router.replace('/(tabs)/home'); 
    } catch (error: any) {
      console.log(error);
      Alert.alert('Hata', error.response?.data?.message || 'Giriş başarısız');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>
      
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Text style={styles.helperText}>Şifre {PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH} karakter olmalı ve en az bir harf içermelidir.</Text>
      
      <TouchableOpacity 
        style={styles.rememberMeContainer} 
        onPress={() => setRememberMe(!rememberMe)}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <FontAwesome5 name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.rememberMeText}>Beni Hatırla</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/auth/register')}>
        <Text style={styles.link}>Hesabın yok mu? Kayıt Ol</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  rememberMeText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  helperText: {
    color: '#666',
    marginTop: -8,
    marginBottom: 12,
    fontSize: 13,
  },
});
