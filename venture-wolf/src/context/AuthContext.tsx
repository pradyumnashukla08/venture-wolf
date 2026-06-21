import React, { createContext, useState, useContext, useEffect } from 'react';

import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    };
    
    boot();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      extractRole(session);
    });

    return () => subscription.unsubscribe();
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

  const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    const response = await fetch(url, options);
    if (response.status === 401) {
      console.warn('Unauthorized request intercepted - signing out');
      await signOut();
      throw new Error('Unauthorized: Session expired. Please log in again.');
    }
    return response;
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
