import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { FundingStage } from '../types/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
type UploadedDoc = { id: string, type: string, path: string, format: string };

type ProfileContextType = {
  profileImage: string | null;
  setProfileImage: (url: string | null) => void;
  startupStage: FundingStage;
  setStartupStage: (stage: FundingStage) => void;
  evaluationResult: any;
  setEvaluationResult: (result: any) => void;
  processedDocIds: string[];
  setProcessedDocIds: (ids: string[]) => void;
  uploadedDocs: UploadedDoc[];
  setUploadedDocs: React.Dispatch<React.SetStateAction<UploadedDoc[]>>;
  isContextLoaded: boolean;
  streakCount: number;
  setStreakCount: React.Dispatch<React.SetStateAction<number>>;
  lastLoginDate: string | null;
  setLastLoginDate: React.Dispatch<React.SetStateAction<string | null>>;
  dailyTaskCompletedDate: string | null;
  setDailyTaskCompletedDate: React.Dispatch<React.SetStateAction<string | null>>;
};

export const ProfileContext = createContext<ProfileContextType>({
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  setProfileImage: () => {},
  startupStage: 'Pre-Seed',
  setStartupStage: () => {},
  evaluationResult: null,
  setEvaluationResult: () => {},
  processedDocIds: [],
  setProcessedDocIds: () => {},
  uploadedDocs: [],
  setUploadedDocs: () => {},
  isContextLoaded: false,
  streakCount: 1,
  setStreakCount: () => {},
  lastLoginDate: null,
  setLastLoginDate: () => {},
  dailyTaskCompletedDate: null,
  setDailyTaskCompletedDate: () => {},
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileImage, setProfileImage] = useState<string | null>('https://randomuser.me/api/portraits/men/32.jpg');
  const [startupStage, setStartupStage] = useState<FundingStage>('Pre-Seed');
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [processedDocIds, setProcessedDocIds] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [lastLoginDate, setLastLoginDate] = useState<string | null>(null);
  const [dailyTaskCompletedDate, setDailyTaskCompletedDate] = useState<string | null>(null);

  // Bootloader
  const loadState = async () => {
      try {
        const storedState = await AsyncStorage.getItem('@profile_context_state');
        if (storedState) {
          const parsed = JSON.parse(storedState);
          if (parsed.startupStage) setStartupStage(parsed.startupStage);
          if (parsed.evaluationResult) setEvaluationResult(parsed.evaluationResult);
          if (parsed.processedDocIds) setProcessedDocIds(parsed.processedDocIds);
          if (parsed.uploadedDocs) setUploadedDocs(parsed.uploadedDocs);
          if (parsed.profileImage) setProfileImage(parsed.profileImage);
          if (parsed.streakCount !== undefined) setStreakCount(parsed.streakCount);
          if (parsed.lastLoginDate) setLastLoginDate(parsed.lastLoginDate);
          if (parsed.dailyTaskCompletedDate) setDailyTaskCompletedDate(parsed.dailyTaskCompletedDate);
        }

        // Fetch remote state to ensure cross-device persistence
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
           const { data, error } = await supabase.storage.from('data_room').download(`${session.user.id}/state.json`);
           if (!error && data) {
              const text = await new Promise<string>((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result as string);
                fr.onerror = reject;
                fr.readAsText(data);
              });
              const remoteParsed = JSON.parse(text);
              if (remoteParsed.startupStage) setStartupStage(remoteParsed.startupStage);
              if (remoteParsed.evaluationResult) setEvaluationResult(remoteParsed.evaluationResult);
              if (remoteParsed.processedDocIds) setProcessedDocIds(remoteParsed.processedDocIds);
              if (remoteParsed.uploadedDocs) setUploadedDocs(remoteParsed.uploadedDocs);
              if (remoteParsed.streakCount !== undefined) setStreakCount(remoteParsed.streakCount);
              if (remoteParsed.lastLoginDate) setLastLoginDate(remoteParsed.lastLoginDate);
              if (remoteParsed.dailyTaskCompletedDate) setDailyTaskCompletedDate(remoteParsed.dailyTaskCompletedDate);
           }
        }
      } catch (e) {
        console.error('Failed to load profile context from storage', e);
      } finally {
        setIsContextLoaded(true);
      }
    };

  useEffect(() => {
    loadState();
  }, []);

  // Streak Calculation Engine
  useEffect(() => {
    if (!isContextLoaded) return;
    
    const today = new Date().toISOString().split('T')[0];
    let updatedStreak = streakCount;
    
    if (lastLoginDate !== today) {
      if (lastLoginDate) {
        const last = new Date(lastLoginDate);
        const curr = new Date(today);
        const diffTime = Math.abs(curr.getTime() - last.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          updatedStreak += 1;
          setStreakCount(updatedStreak);
        } else if (diffDays > 1) {
          updatedStreak = 1;
          setStreakCount(updatedStreak);
        }
      }
      setLastLoginDate(today);
    }
    
    if (dailyTaskCompletedDate && dailyTaskCompletedDate !== today) {
      setDailyTaskCompletedDate(null);
    }
  }, [isContextLoaded]); // run once after load

  // Listen for Sign Out and Sign In
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setProfileImage(null);
        setEvaluationResult(null);
        setProcessedDocIds([]);
        setUploadedDocs([]);
        setStartupStage('Pre-Seed');
        setStreakCount(1);
        setLastLoginDate(null);
        setDailyTaskCompletedDate(null);
        AsyncStorage.removeItem('@profile_context_state');
        AsyncStorage.removeItem('@draft_profile_cache'); // Clear the profile draft too
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Reload state when user logs in so we don't show an empty profile
        loadState();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Watcher
  useEffect(() => {
    if (!isContextLoaded) return;
    const saveState = async () => {
      try {
        const stateObj = {
          startupStage,
          evaluationResult,
          processedDocIds,
          uploadedDocs,
          profileImage,
          streakCount,
          lastLoginDate,
          dailyTaskCompletedDate
        };
        await AsyncStorage.setItem('@profile_context_state', JSON.stringify(stateObj));

        // Sync to cloud for remote persistence across devices
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
           await supabase.storage.from('data_room').upload(`${session.user.id}/state.json`, JSON.stringify(stateObj), {
              contentType: 'application/json',
              upsert: true
           });
        }
      } catch (e) {
        console.error('Failed to save profile context to storage', e);
      }
    };
    saveState();
  }, [startupStage, evaluationResult, processedDocIds, uploadedDocs, profileImage, streakCount, lastLoginDate, dailyTaskCompletedDate, isContextLoaded]);
  
  const contextValue = useMemo(() => ({
    profileImage,
    setProfileImage,
    startupStage,
    setStartupStage,
    evaluationResult,
    setEvaluationResult,
    processedDocIds,
    setProcessedDocIds,
    uploadedDocs,
    setUploadedDocs,
    isContextLoaded,
    streakCount,
    setStreakCount,
    lastLoginDate,
    setLastLoginDate,
    dailyTaskCompletedDate,
    setDailyTaskCompletedDate
  }), [profileImage, startupStage, evaluationResult, processedDocIds, uploadedDocs, isContextLoaded, streakCount, lastLoginDate, dailyTaskCompletedDate]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
