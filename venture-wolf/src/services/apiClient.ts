import axios from 'axios';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased timeout to 2 minutes for Render cold starts + AI generation
  headers: { 'Content-Type': 'application/json' }
});

// Secure JWT Header Injection — reads the live Supabase session token
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error fetching Supabase session for API request', error);
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
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);
