import React, { createContext, useState, useContext, useEffect } from 'react';

import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import * as Linking from 'expo-linking';

type AuthContextType = {
  isAuthenticated: boolean;
  userRole: 'founder' | 'investor' | null;
  isProfileComplete: boolean;
  isDataImported: boolean;
  user: User | null;
  login: () => void;
  setRoleOffline: (role: 'founder' | 'investor') => Promise<void>;
  completeProfile: () => void;
  completeImport: () => void;
  signOut: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'founder' | 'investor' | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isDataImported, setIsDataImported] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setUserRole(null);
      return;
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().role) {
        setUserRole(userDoc.data().role);
      } else {
        setUserRole('founder'); // Default fallback
      }
    } catch (e) {
      console.error('Failed to fetch role', e);
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

      // Silently ping the backend to wake it up from sleep (Render cold start mitigation)
      fetch(`${API_BASE_URL.replace('/api', '/health')}`).catch(() => console.log('Ping failed, backend might be starting.'));
    };
    
    boot();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      fetchRole(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

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
    await firebaseSignOut(auth);
    setIsAuthenticated(false);
    setUserRole(null);
    setIsProfileComplete(false);
    setIsDataImported(false);
    await AsyncStorage.removeItem('@is_profile_complete');
    await AsyncStorage.removeItem('@is_data_imported');
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    const headers = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...options.headers,
    } as Record<string, string>;

    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
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

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole,
      isProfileComplete, 
      isDataImported, 
      user,
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
