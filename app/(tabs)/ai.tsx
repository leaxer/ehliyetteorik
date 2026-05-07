import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../constants/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  createdAt: Date;
}

export default function AIScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Merhaba! Ben senin yapay zeka destekli sürüş eğitmeninim. Trafik kuralları, levhalar veya motor tekniği ile ilgili aklına takılan her şeyi bana sorabilirsin. 🚗💡',
      sender: 'bot',
      createdAt: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const history = messages.slice(-10).map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

      const response = await axios.post(
        `${API_BASE_URL}/ai/chat`,
        {
          message: messageText,
          history,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        }
      );

      const replyText = typeof response.data?.reply === 'string'
        ? response.data.reply
        : 'Şu an yanıt üretilemedi. Lütfen tekrar dene.';

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: 'bot',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: typeof backendMessage === 'string'
          ? backendMessage
          : 'AI servisine şu an ulaşılamıyor. Birazdan tekrar dene.',
        sender: 'bot',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await SecureStore.deleteItemAsync('userToken');
        router.replace('/auth/login');
      } else if (!backendMessage) {
        Alert.alert('Bağlantı Hatası', 'AI servisine erişilemedi.');
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Asistan</Text>
        <Text style={styles.headerSubtitle}>Trafik kuralları hakkında her şeyi sor</Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.message, msg.sender === 'bot' ? styles.botMessage : styles.userMessage]}>
            <Text style={[styles.messageText, msg.sender === 'user' && styles.userMessageText]}>{msg.text}</Text>
          </View>
        ))}
        {isTyping && (
          <View style={[styles.message, styles.botMessage]}>
            <ActivityIndicator size="small" color="#4F46E5" />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Bir soru sor..." 
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <FontAwesome5 name="paper-plane" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  chatContainer: {
    padding: 20,
    flexGrow: 1,
  },
  message: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  botMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessage: {
    backgroundColor: '#4F46E5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#4F46E5',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
