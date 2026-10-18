import axios from 'axios';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased timeout to 2 minutes for Render cold starts + AI generation
  headers: { 
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  }
});

// Secure JWT Header Injection — reads the live Firebase session token
apiClient.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching Firebase token for API request', error);
  }
  return config;
});

// Global Error Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Trigger global logout & redirect to LoginScreen
      console.warn('Unauthorized API response — signing out');
      await signOut(auth);
    }
    return Promise.reject(error);
  }
);
