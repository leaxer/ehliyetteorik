import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { AUTH_URL } from '../../constants/api';

const PASSWORD_MIN_LENGTH = 3;
const PASSWORD_MAX_LENGTH = 30;
const PASSWORD_LETTER_REGEX = /[A-Za-zÇĞİÖŞÜçğıöşü]/;

const isPasswordValidByPolicy = (value: string) => {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  return PASSWORD_LETTER_REGEX.test(value);
};

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!isPasswordValidByPolicy(password)) {
      Alert.alert('Hata', `Şifre ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} karakter olmalı ve en az bir harf içermelidir.`);
      return;
    }

    try {
      await axios.post(`${AUTH_URL}/register`, { name, email, password });
      Alert.alert('Başarılı', 'Hesabın başarıyla oluşturuldu!', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.log(error);
      Alert.alert('Hata', error.response?.data?.message || 'Kayıt başarısız');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıt Ol</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ad Soyad"
        value={name}
        onChangeText={setName}
      />
      
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
      
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Kayıt Ol</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Zaten hesabın var mı? Giriş Yap</Text>
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
  button: {
    backgroundColor: '#34C759',
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
