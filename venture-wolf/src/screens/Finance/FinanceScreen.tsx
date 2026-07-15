import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import axios from 'axios';
import { ForecastForm } from './ForecastForm';
import { ForecastLoading } from './ForecastLoading';
import { ProjectionsDashboard } from './ProjectionsDashboard';
import { ForecastRequest, ForecastResponse } from './types';
import { theme } from '../../constants/theme';
// Assuming backend URL can be imported, fallback to localhost for dev
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

type ViewState = 'FORM' | 'LOADING' | 'DASHBOARD';

export const FinanceScreen = () => {
  const [currentView, setCurrentView] = useState<ViewState>('FORM');
  const [projectionsData, setProjectionsData] = useState<any>(null);
  const [assumptionsGenerated, setAssumptionsGenerated] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const [highRiskOfRuin, setHighRiskOfRuin] = useState<boolean>(false);

  const handleGenerateForecast = async (formData: ForecastRequest) => {
    setCurrentView('LOADING');
    try {
      const response = await axios.post<ForecastResponse>(`${BACKEND_URL}/finance/forecast`, formData);
      if (response.data.success && response.data.data) {
        setProjectionsData(response.data.data.projections);
        setAssumptionsGenerated(response.data.data.assumptionsGenerated);
        setDownloadUrl(response.data.data.downloadUrl);
        setHighRiskOfRuin(response.data.data.highRiskOfRuin || false);
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {currentView === 'FORM' && (
          <ForecastForm onSubmit={handleGenerateForecast} />
        )}
        {currentView === 'LOADING' && (
          <ForecastLoading />
        )}
        {currentView === 'DASHBOARD' && projectionsData && (
          <ProjectionsDashboard 
            projections={projectionsData} 
            assumptions={assumptionsGenerated}
            downloadUrl={downloadUrl} 
            highRiskOfRuin={highRiskOfRuin}
            onReset={handleReset}
          />
        )}
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
