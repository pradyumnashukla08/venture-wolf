import React, { useEffect } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ProfileBootstrapper = ({ children }: { children: React.ReactNode }) => {
  const {
    isContextLoaded, setIsContextLoaded,
    startupStage, setStartupStage,
    evaluationResult, setEvaluationResult,
    processedDocIds, setProcessedDocIds,
    uploadedDocs, setUploadedDocs,
    profileImage, setProfileImage,
    streakCount, setStreakCount,
    lastLoginDate, setLastLoginDate,
    dailyTaskCompletedDate, setDailyTaskCompletedDate,
    resetProfile
  } = useProfileStore();

  // Bootloader for remote state
  const loadState = async () => {
    try {
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
      console.error('Failed to load profile context from cloud storage', e);
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
  }, [isContextLoaded]);

  // Listen for Sign Out and Sign In
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        resetProfile();
        AsyncStorage.removeItem('@draft_profile_cache');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadState();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Watcher for Remote Sync
  useEffect(() => {
    if (!isContextLoaded) return;
    const saveState = async () => {
      try {
        const stateObj = {
          startupStage, evaluationResult, processedDocIds, uploadedDocs,
          profileImage, streakCount, lastLoginDate, dailyTaskCompletedDate
        };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
           await supabase.storage.from('data_room').upload(`${session.user.id}/state.json`, JSON.stringify(stateObj), {
              contentType: 'application/json',
              upsert: true
           });
        }
      } catch (e) {
        console.error('Failed to sync profile context to cloud', e);
      }
    };
    saveState();
  }, [startupStage, evaluationResult, processedDocIds, uploadedDocs, profileImage, streakCount, lastLoginDate, dailyTaskCompletedDate, isContextLoaded]);

  return <>{children}</>;
};
