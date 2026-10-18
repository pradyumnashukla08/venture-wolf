import React, { useEffect } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ProfileBootstrapper = ({ children }: { children: React.ReactNode }) => {
  const {
    isContextLoaded, setIsContextLoaded,
    startupStage, setStartupStage,
    evaluationResult, setEvaluationResult,
    processedDocIds, setProcessedDocIds,
    uploadedDocs, setUploadedDocs,
    profileImage, setProfileImage,
    fullName,
    streakCount, setStreakCount,
    lastLoginDate, setLastLoginDate,
    dailyTaskCompletedDate, setDailyTaskCompletedDate,
    resetProfile
  } = useProfileStore();

  // Bootloader for remote state
  const loadState = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        try {
          const stateRef = doc(db, 'user_states', currentUser.uid);
          const snap = await getDoc(stateRef);
          
          if (snap.exists()) {
            const remoteParsed = snap.data();
            if (remoteParsed.startupStage) setStartupStage(remoteParsed.startupStage);
            if (remoteParsed.evaluationResult) setEvaluationResult(remoteParsed.evaluationResult);
            if (remoteParsed.processedDocIds) setProcessedDocIds(remoteParsed.processedDocIds);
            if (remoteParsed.uploadedDocs) setUploadedDocs(remoteParsed.uploadedDocs);
            if (remoteParsed.streakCount !== undefined) setStreakCount(remoteParsed.streakCount);
            if (remoteParsed.lastLoginDate) setLastLoginDate(remoteParsed.lastLoginDate);
            if (remoteParsed.dailyTaskCompletedDate) setDailyTaskCompletedDate(remoteParsed.dailyTaskCompletedDate);
            if (remoteParsed.profileImage) setProfileImage(remoteParsed.profileImage);
            if (remoteParsed.fullName) useProfileStore.getState().setFullName(remoteParsed.fullName);
          }
          
          // Fallback: Fetch fullName from users collection if it's not in user_states
          const userStoreName = useProfileStore.getState().fullName;
          if (!userStoreName) {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().fullName) {
              useProfileStore.getState().setFullName(userSnap.data().fullName);
            }
          }
        } catch (dbError) {
          console.warn('Could not fetch remote profile state', dbError);
        }
      }
    } catch (e) {
      console.error('Failed to load profile context', e);
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        resetProfile();
        AsyncStorage.removeItem('@draft_profile_cache');
      } else {
        loadState();
      }
    });
    return () => unsubscribe();
  }, []);

  // Watcher for Remote Sync
  useEffect(() => {
    if (!isContextLoaded) return;
    const saveState = async () => {
      try {
        const stateObj = {
          startupStage, evaluationResult, processedDocIds, uploadedDocs,
          profileImage, streakCount, lastLoginDate, dailyTaskCompletedDate,
          fullName
        };
        const currentUser = auth.currentUser;
        if (currentUser?.uid) {
           const stateRef = doc(db, 'user_states', currentUser.uid);
           await setDoc(stateRef, stateObj, { merge: true });
        }
      } catch (e) {
        console.error('Failed to sync profile context to cloud', e);
      }
    };
    saveState();
  }, [startupStage, evaluationResult, processedDocIds, uploadedDocs, profileImage, streakCount, lastLoginDate, dailyTaskCompletedDate, fullName, isContextLoaded]);

  return <>{children}</>;
};
