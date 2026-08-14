import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FundingStage } from '../types/schema';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfileStore } from '../store/useProfileStore';

export const validateLinkedIn = (url: string) => {
  if (!url) return true;
  return /^https:\/\/(www\.)?linkedin\.com\/.+$/.test(url);
};

export const validateUrl = (url: string) => {
  if (!url) return true;
  // Allows optional http(s)://, requires domain name and a valid TLD (2+ chars like .in, .tech, .com)
  const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return pattern.test(url.trim());
};

export const useProfileForm = () => {
  const { session } = useAuth();
  const { setStartupStage, setProfileImage } = useProfileStore();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Identity
    fullName: '',
    role: '',
    profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    linkedinUrl: '',
    email: '',
    pedigree: 'First-Time Founder',
    team: [{ name: '', role: '', linkedin: '' }],
    
    // Core
    companyName: '',
    websiteUrl: '',
    isRegistered: false,
    registrationNo: '',
    sector: 'SaaS',
    stage: 'Pre-Seed' as FundingStage,
    pitch: '',
    currency: '₹ (INR)',
    
    // Market
    tam: '',
    sam: '',
    som: '',
    tamMethodology: '',
    competitor1: '',
    competitor2: '',
    competitor3: '',
    distributionMoat: '',
    
    // Fundraising
    targetRaise: '',
    valuationCap: '',
    equityOffered: '',
    capitalCommitted: '',
    
    // Traction (Dynamic)
    // Pre-Seed
    waitlistCount: '',
    betaConversion: '',
    productStatus: '',
    problemValidation: '',
    teamCapability: '',
    runway: '',
    
    // Seed
    currentMrr: '',
    userTraction: '',
    momGrowth: '',
    grossMargin: '',
    cac: '',
    
    // Series A
    verifiedArr: '',
    churnRate: '',
    nrr: '',
    ltvcacRatio: '',
    cacPayback: '',
    burnRate: '',
    execSales: false,
    execEng: false,
    execMarketing: false,
    
    // Series B
    annualRevenue: '',
    expansionVectors: [] as string[],
    cSuiteComplete: false,
    marketShare: '',
  });

  const isMounted = useRef(true);

  // Load Draft
  useEffect(() => {
    const loadDraft = async () => {
      try {
        let cached = null;
        if (Platform.OS === 'web') {
          cached = window.localStorage.getItem('@draft_profile_cache');
        } else {
          cached = await AsyncStorage.getItem('@draft_profile_cache').catch(() => null);
        }

        if (!cached && session?.user?.id) {
          const { data, error } = await supabase.storage.from('data_room').download(`${session.user.id}/profile_draft.json`);
          if (!error && data) {
            const text = await new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result as string);
              fr.onerror = reject;
              fr.readAsText(data);
            });
            cached = text;
            if (Platform.OS === 'web') {
              window.localStorage.setItem('@draft_profile_cache', text);
            } else {
              AsyncStorage.setItem('@draft_profile_cache', text).catch(() => {});
            }
          }
        }

        if (cached && isMounted.current) {
          const parsed = JSON.parse(cached);
          if (!parsed.fullName && session?.user?.user_metadata?.full_name) {
            parsed.fullName = session.user.user_metadata.full_name;
          }
          if (!parsed.email && session?.user?.email) {
            parsed.email = session.user.email;
          }
          if ((!parsed.profileImage || parsed.profileImage.includes('randomuser.me')) && session?.user?.user_metadata?.avatar_url) {
            parsed.profileImage = session.user.user_metadata.avatar_url;
          }
          setFormData(prev => ({ ...prev, ...parsed }));
          if (parsed.stage) setStartupStage(parsed.stage);
        } else if (session?.user && isMounted.current) {
          setFormData(prev => {
            const newName = session.user.user_metadata?.full_name || prev.fullName;
            const newEmail = session.user.email || prev.email;
            const newAvatar = session.user.user_metadata?.avatar_url || prev.profileImage;
            if (prev.fullName === newName && prev.email === newEmail && prev.profileImage === newAvatar) return prev;
            return { ...prev, fullName: newName, email: newEmail, profileImage: newAvatar };
          });
        }
      } catch (e) {
        console.log('Load Draft Error', e);
      }
    };
    
    loadDraft();
    return () => { isMounted.current = false; };
  }, [session, setStartupStage]);

  // Save Draft
  useEffect(() => {
    setIsSaving(true);
    const saveDraft = setTimeout(async () => {
      try {
        if (Platform.OS === 'web') {
          window.localStorage.setItem('@draft_profile_cache', JSON.stringify(formData));
        } else {
          await AsyncStorage.setItem('@draft_profile_cache', JSON.stringify(formData));
        }

        if (session?.user?.id) {
          const { error } = await supabase.from('startups').upsert({
            id: session.user.id,
            company_name: formData.companyName || 'Pending Profile'
          }, { onConflict: 'id' });
          if (error) console.log('Background Sync Error:', error.message);
          
          await supabase.storage.from('data_room').upload(`${session.user.id}/profile_draft.json`, JSON.stringify(formData), {
            contentType: 'application/json',
            upsert: true
          }).catch(e => console.log('Draft Sync Error:', e.message));
        }

        if (isMounted.current) setIsSaving(false);
      } catch (err) {
        // Handle gracefully
      }
    }, 800);
    return () => clearTimeout(saveDraft);
  }, [formData, session]);

  // Profile Image Sync
  useEffect(() => {
    if (formData.profileImage) {
      setProfileImage(formData.profileImage);
    }
  }, [formData.profileImage, setProfileImage]);

  // Actions
  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'stage') setStartupStage(value as FundingStage);
    if (field === 'profileImage') setProfileImage(value as string);
  };

  const addTeamMember = () => {
    if (formData.team.length >= 4) return;
    handleChange('team', [...formData.team, { name: '', role: '', linkedin: '' }]);
  };

  const updateTeamMember = (index: number, field: string, value: string) => {
    const newTeam = [...formData.team];
    newTeam[index] = { ...newTeam[index], [field]: value };
    handleChange('team', newTeam);
  };

  const mockAvatars = [
    'https://randomuser.me/api/portraits/men/32.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
    'https://randomuser.me/api/portraits/men/67.jpg',
    '', // empty to test initials
  ];

  const handleImageChange = () => {
    const currentIndex = mockAvatars.indexOf(formData.profileImage || '');
    const nextIndex = (currentIndex + 1) % mockAvatars.length;
    handleChange('profileImage', mockAvatars[nextIndex]);
  };

  return {
    formData,
    isSaving,
    handleChange,
    addTeamMember,
    updateTeamMember,
    handleImageChange
  };
};
