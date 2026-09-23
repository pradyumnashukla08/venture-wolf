import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ForecastForm } from './ForecastForm';
import { ForecastLoading } from './ForecastLoading';
import { ProjectionsDashboard } from './ProjectionsDashboard';
import { ForecastProvenance } from '../../components/ForecastProvenance';
import { ForecastRequest, ForecastResponse, GuardrailCorrection, ValuationAudit } from './types';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Dynamically route to local backend during development to avoid production server issues
const getBackendUrl = () => {
  if (__DEV__) {
    // For physical devices on the same Wi-Fi network, extract the host IP from Expo's dev server config
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:3000/api`;
    }
    // Android emulator needs 10.0.2.2 to access host's localhost
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
  }
  return process.env.EXPO_PUBLIC_API_URL || 'https://venture-wolf-25me.onrender.com/api';
};

const BACKEND_URL = getBackendUrl();

type ViewState = 'FORM' | 'LOADING' | 'DASHBOARD';

export const FinanceScreen = () => {
  const navigation = useNavigation<any>();
  const [currentView, setCurrentView] = useState<ViewState>('FORM');
  const [projectionsData, setProjectionsData] = useState<any>(null);
  const [assumptionsGenerated, setAssumptionsGenerated] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [highRiskOfRuin, setHighRiskOfRuin] = useState<boolean>(false);

  // Provenance travels with the forecast: what was assumed, where the India
  // guardrails overruled the model, and whether the valuation is supported by
  // anything. Undefined for results cached before this existed.
  const [disclosure, setDisclosure] = useState<string | undefined>(undefined);
  const [guardrailCorrections, setGuardrailCorrections] = useState<GuardrailCorrection[] | undefined>(undefined);
  const [valuationAudit, setValuationAudit] = useState<ValuationAudit | undefined>(undefined);
  const [sectorChangedWarning, setSectorChangedWarning] = useState<boolean>(false);

  useEffect(() => {
    const loadLatestForecast = async () => {
      try {
        const latest = await AsyncStorage.getItem('@latest_forecast_cache');
        if (latest) {
          const parsed = JSON.parse(latest);

          let currentArchetype = 'SAAS';
          const cachedProfile = await AsyncStorage.getItem('@draft_profile_cache').catch(() => null);
          if (cachedProfile) {
             const parsedProfile = JSON.parse(cachedProfile);
             if (parsedProfile.sector) {
                const sector = parsedProfile.sector.toUpperCase();
                if (sector === 'MANUFACTURING') currentArchetype = 'MANUFACTURING';
                else if (sector === 'SERVICES') currentArchetype = 'SERVICES';
             }
          }

          if (parsed.archetype && parsed.archetype !== currentArchetype) {
             setSectorChangedWarning(true);
             return;
          }

          setProjectionsData(parsed.projectionsData);
          setAssumptionsGenerated(parsed.assumptionsGenerated);
          setDownloadUrl(parsed.downloadUrl);
          setHighRiskOfRuin(parsed.highRiskOfRuin);
          setDisclosure(parsed.disclosure);
          setGuardrailCorrections(parsed.guardrailCorrections);
          setValuationAudit(parsed.valuationAudit);
          setCurrentView('DASHBOARD');
        }
      } catch (e) {
        // ignore
      }
    };
    loadLatestForecast();
  }, []);

  const handleGenerateForecast = async (formData: ForecastRequest) => {
    setCurrentView('LOADING');
    try {
      const cacheKey = `@forecast_cache_${JSON.stringify(formData)}`;
      const cachedResult = await AsyncStorage.getItem(cacheKey).catch(() => null);
      
      if (cachedResult) {
        const parsed = JSON.parse(cachedResult);
        setProjectionsData(parsed.projectionsData);
        setAssumptionsGenerated(parsed.assumptionsGenerated);
        setDownloadUrl(parsed.downloadUrl);
        setHighRiskOfRuin(parsed.highRiskOfRuin);
        setDisclosure(parsed.disclosure);
        setGuardrailCorrections(parsed.guardrailCorrections);
        setValuationAudit(parsed.valuationAudit);
        setCurrentView('DASHBOARD');
        await AsyncStorage.setItem('@latest_forecast_cache', cachedResult).catch(() => {});
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await axios.post<ForecastResponse>(`${BACKEND_URL}/finance/forecast`, formData, {
        headers: {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
        }
      });
      if (response.data.success && response.data.data) {
        const responseData = response.data.data;
        setProjectionsData(responseData.projections);
        setAssumptionsGenerated(responseData.assumptionsGenerated);
        setDownloadUrl(responseData.downloadUrl);
        setHighRiskOfRuin(responseData.highRiskOfRuin || false);
        setDisclosure(responseData.disclosure);
        setGuardrailCorrections(responseData.guardrailCorrections);
        setValuationAudit(responseData.valuationAudit);

        // Cache the successful result
        const cachePayload = JSON.stringify({
          projectionsData: responseData.projections,
          assumptionsGenerated: responseData.assumptionsGenerated,
          downloadUrl: responseData.downloadUrl,
          highRiskOfRuin: responseData.highRiskOfRuin || false,
          disclosure: responseData.disclosure,
          guardrailCorrections: responseData.guardrailCorrections,
          valuationAudit: responseData.valuationAudit,
          archetype: formData.archetype,
        });
        await AsyncStorage.setItem(cacheKey, cachePayload).catch(() => {});
        await AsyncStorage.setItem('@latest_forecast_cache', cachePayload).catch(() => {});

        setCurrentView('DASHBOARD');
      } else {
        throw new Error(response.data.message || 'Forecast engine failed to return data.');
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred.';
      Alert.alert('Forecast Generation Failed', errorMessage, [
        { text: 'Try Again', onPress: () => setCurrentView('FORM') }
      ]);
    }
  };

  const handleReset = () => {
    setProjectionsData(null);
    setAssumptionsGenerated(null);
    setDownloadUrl('');
    setHighRiskOfRuin(false);
    setCurrentView('FORM');
  };

  const handleFormBack = async () => {
    const latest = await AsyncStorage.getItem('@latest_forecast_cache').catch(() => null);
    if (latest) {
      const parsed = JSON.parse(latest);
      setProjectionsData(parsed.projectionsData);
      setAssumptionsGenerated(parsed.assumptionsGenerated);
      setDownloadUrl(parsed.downloadUrl);
      setHighRiskOfRuin(parsed.highRiskOfRuin);
      setCurrentView('DASHBOARD');
    } else {
      navigation.navigate('FounderTabs');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'FORM':
        return <ForecastForm onSubmit={handleGenerateForecast} onBack={handleFormBack} sectorChangedWarning={sectorChangedWarning} />;
      case 'LOADING':
        return <ForecastLoading />;
      case 'DASHBOARD':
        return (
          <>
            <ProjectionsDashboard 
              projections={projectionsData} 
              assumptions={assumptionsGenerated}
              downloadUrl={downloadUrl} 
              highRiskOfRuin={highRiskOfRuin}
              onReset={handleReset}
            />
            <ForecastProvenance
              disclosure={disclosure}
              corrections={guardrailCorrections}
              valuationAudit={valuationAudit}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderView()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  keyboardView: {
    flex: 1,
  }
});
