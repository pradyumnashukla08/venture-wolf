import React, { createContext, useState, useContext, useEffect } from 'react';

import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import * as Linking from 'expo-linking';

type AuthContextType = {
  isAuthenticated: boolean;
  userRole: 'founder' | 'investor' | null;
  isProfileComplete: boolean;
  isDataImported: boolean;
  session: Session | null;
  login: () => void;
  setRoleOffline: (role: 'founder' | 'investor') => Promise<void>;
  completeProfile: () => void;
  completeImport: () => void;
  signOut: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'founder' | 'investor' | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isDataImported, setIsDataImported] = useState(false);
  const [loading, setLoading] = useState(true);

  const extractRole = (currentSession: Session | null) => {
    if (currentSession?.user?.user_metadata?.user_role) {
      setUserRole(currentSession.user.user_metadata.user_role);
    } else {
      // Default to founder if undefined (e.g. legacy accounts or raw Google logins)
      // In a production app, we would query the `profiles` table here instead.
      setUserRole('founder'); 
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('@is_profile_complete');
        if (storedProfile === 'true') setIsProfileComplete(true);
        const storedImport = await AsyncStorage.getItem('@is_data_imported');
        if (storedImport === 'true') setIsDataImported(true);
      } catch (e) {
        console.error("Failed to load local storage in AuthContext", e);
      }

      // Check active session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsAuthenticated(!!session);
        extractRole(session);
        setLoading(false);
      });

      // Silently ping the backend to wake it up from sleep (Render cold start mitigation)
      fetch(`${API_BASE_URL.replace('/api', '/health')}`).catch(() => console.log('Ping failed, backend might be starting.'));
    };
    
    boot();

    // 1. Hardened Global Deep Link Listener
    const handleDeepLink = async (event: Linking.EventType) => {
      try {
        const url = event.url;
        console.log('[AuthContext] Intercepted deep link:', url);
        
        if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=')) {
          console.log('[AuthContext] URL contains session tokens. Attempting to parse...');
          
          const getParam = (name: string) => {
            const match = url.match(new RegExp(`[#?&]${name}=([^&]+)`));
            return match ? decodeURIComponent(match[1]) : null;
          };

          const access_token = getParam('access_token');
          const refresh_token = getParam('refresh_token');
          const code = getParam('code');
          
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              console.error('[AuthContext] Supabase failed to set session from URL tokens:', error.message);
            } else {
              console.log('[AuthContext] Successfully established session from URL!');
            }
          } else if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[AuthContext] Supabase failed to exchange code from URL:', error.message);
            } else {
              console.log('[AuthContext] Successfully exchanged code for session from URL!');
            }
          }
        }
      } catch (err: any) {
        // Prevent fatal JS thread crash by catching all exceptions
        console.error('[AuthContext] Critical failure in deep link listener:', err?.message || err);
      }
    };

    // Subscribe to incoming links while app is active
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Catch cold boot deep links
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    }).catch(err => console.error('[AuthContext] Failed to get initial URL:', err));

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      extractRole(session);
    });

    return () => {
      authSubscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  // Temporary mock login for development if needed
  const login = () => setIsAuthenticated(true);
  
  const setRoleOffline = async (role: 'founder' | 'investor') => {
    setUserRole(role);
  };

  const completeProfile = () => {
    setIsProfileComplete(true);
    AsyncStorage.setItem('@is_profile_complete', 'true').catch(console.error);
  };
  
  const completeImport = () => {
    setIsDataImported(true);
    AsyncStorage.setItem('@is_data_imported', 'true').catch(console.error);
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setIsProfileComplete(false);
    setIsDataImported(false);
    await AsyncStorage.removeItem('@is_profile_complete');
    await AsyncStorage.removeItem('@is_data_imported');
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...options.headers,
    } as Record<string, string>;

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        console.warn('Unauthorized request intercepted - signing out');
        await signOut();
        throw new Error('Unauthorized: Session expired. Please log in again.');
      }
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('[apiFetch] Network or Request Error:', error.message);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond. Please try again.');
      }
      throw new Error(error.message || 'Network request failed. Please check your internet connection.');
    }
  };

  // Prevent rendering children until the initial session check is complete
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole,
      isProfileComplete, 
      isDataImported, 
      session,
      login, 
      setRoleOffline,
      completeProfile, 
      completeImport,
      signOut,
      apiFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
