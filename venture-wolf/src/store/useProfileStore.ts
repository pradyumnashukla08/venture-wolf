import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FundingStage } from '../types/schema';
import type { EvaluationResult } from '../types/evaluation';

type UploadedDoc = { id: string, type: string, path: string, format: string };

interface ProfileState {
  profileImage: string | null;
  startupStage: FundingStage;
  evaluationResult: EvaluationResult | null;
  processedDocIds: string[];
  uploadedDocs: UploadedDoc[];
  isContextLoaded: boolean;
  streakCount: number;
  lastLoginDate: string | null;
  dailyTaskCompletedDate: string | null;
  
  // Actions
  setProfileImage: (url: string | null) => void;
  setStartupStage: (stage: FundingStage) => void;
  setEvaluationResult: (result: EvaluationResult | null) => void;
  setProcessedDocIds: (ids: string[]) => void;
  setUploadedDocs: (docs: UploadedDoc[] | ((docs: UploadedDoc[]) => UploadedDoc[])) => void;
  setIsContextLoaded: (loaded: boolean) => void;
  setStreakCount: (count: number) => void;
  setLastLoginDate: (date: string | null) => void;
  setDailyTaskCompletedDate: (date: string | null) => void;
  resetProfile: () => void;
}

const initialState = {
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  startupStage: 'Pre-Seed' as FundingStage,
  evaluationResult: null,
  processedDocIds: [],
  uploadedDocs: [],
  isContextLoaded: false,
  streakCount: 1,
  lastLoginDate: null,
  dailyTaskCompletedDate: null,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...initialState,
      setProfileImage: (url) => set({ profileImage: url }),
      setStartupStage: (stage) => set({ startupStage: stage }),
      setEvaluationResult: (result) => set({ evaluationResult: result }),
      setProcessedDocIds: (ids) => set({ processedDocIds: ids }),
      setUploadedDocs: (docs) => set((state) => ({ 
        uploadedDocs: typeof docs === 'function' ? docs(state.uploadedDocs) : docs 
      })),
      setIsContextLoaded: (loaded) => set({ isContextLoaded: loaded }),
      setStreakCount: (count) => set({ streakCount: count }),
      setLastLoginDate: (date) => set({ lastLoginDate: date }),
      setDailyTaskCompletedDate: (date) => set({ dailyTaskCompletedDate: date }),
      resetProfile: () => set(initialState),
    }),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setIsContextLoaded(true);
      },
    }
  )
);
