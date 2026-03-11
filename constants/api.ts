import { Platform } from 'react-native';

// API URL Configuration
// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator/Web
// For physical devices, replace 'localhost' with your computer's local IP address (e.g., 192.168.1.X)
export const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000/api' 
  : 'http://localhost:3000/api';

export const AUTH_URL = `${API_BASE_URL}/auth`;
