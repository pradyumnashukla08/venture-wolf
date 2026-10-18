import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { FundingStage } from '../types/schema';
import { storage, db } from '../lib/firebase';
import { ref, getBytes, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
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
  const { user } = useAuth();
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
    companyType: '',
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

        if (!cached && user?.uid) {
          try {
            const fileRef = ref(storage, `data_room/${user.uid}/profile_draft.json`);
            const arrayBuffer = await getBytes(fileRef);
            const text = new TextDecoder().decode(arrayBuffer);
            cached = text;
            if (Platform.OS === 'web') {
              window.localStorage.setItem('@draft_profile_cache', text);
            } else {
              AsyncStorage.setItem('@draft_profile_cache', text).catch(() => {});
            }
          } catch (storageError) {
            // Ignore if file doesn't exist
          }
        }

        if (cached && isMounted.current) {
          const parsed = JSON.parse(cached);
          if (!parsed.fullName && user?.displayName) {
            parsed.fullName = user.displayName;
          }
          if (!parsed.email && user?.email) {
            parsed.email = user.email;
          }
          if ((!parsed.profileImage || parsed.profileImage.includes('randomuser.me')) && user?.photoURL) {
            parsed.profileImage = user.photoURL;
          }
          setFormData(prev => ({ ...prev, ...parsed }));
          if (parsed.stage) setStartupStage(parsed.stage);
        } else if (user && isMounted.current) {
          setFormData(prev => {
            const newName = user.displayName || prev.fullName;
            const newEmail = user.email || prev.email;
            const newAvatar = user.photoURL || prev.profileImage;
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
  }, [user, setStartupStage]);

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

        if (user?.uid) {
          try {
            await setDoc(doc(db, 'startups', user.uid), {
              company_name: formData.companyName || 'Pending Profile'
            }, { merge: true });
          } catch (error: any) {
            console.log('Background Sync Error:', error.message);
          }
          
          const fileRef = ref(storage, `data_room/${user.uid}/profile_draft.json`);
          await uploadString(fileRef, JSON.stringify(formData), 'raw', { contentType: 'application/json' })
            .catch(e => console.log('Draft Sync Error:', e.message));
        }

        if (isMounted.current) setIsSaving(false);
      } catch (err) {
        // Handle gracefully
      }
    }, 800);
    return () => clearTimeout(saveDraft);
  }, [formData, user]);

  // Profile Image Sync
  useEffect(() => {
    if (formData.profileImage) {
      setProfileImage(formData.profileImage);
    }
  }, [formData.profileImage, setProfileImage]);

  // Full Name Sync
  useEffect(() => {
    if (formData.fullName) {
      useProfileStore.getState().setFullName(formData.fullName);
    }
  }, [formData.fullName]);

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

  const handleImageChange = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.size && asset.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          return;
        }

        if (user) {
          // Read as Base64 for React Native Fetch limitations
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
          const arrayBuffer = decode(base64);
          
          const fileRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.jpg`);
          await uploadBytes(fileRef, arrayBuffer, { contentType: asset.mimeType || 'image/jpeg' });
          const downloadUrl = await getDownloadURL(fileRef);
          
          handleChange('profileImage', downloadUrl);
        } else {
          handleChange('profileImage', asset.uri);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Upload Failed', 'There was a problem uploading your profile image.');
    }
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
