import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production URL hardcoded to guarantee connectivity in standalone APK builds
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://venture-wolf-25me.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for AI generation tasks
  headers: { 'Content-Type': 'application/json' }
});

// Secure JWT Header Injection
apiClient.interceptors.request.use(async (config) => {
  try {
    let token;
    if (Platform.OS === 'web') {
      token = window.localStorage.getItem('@auth_token');
    } else {
      token = await AsyncStorage.getItem('@auth_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token for API request', error);
  }
  return config;
});

// Global Error Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Trigger global logout & redirect to LoginScreen
      console.warn('Unauthorized request - redirecting to login');
      AsyncStorage.removeItem('@auth_token');
    }
    return Promise.reject(error);
  }
);
