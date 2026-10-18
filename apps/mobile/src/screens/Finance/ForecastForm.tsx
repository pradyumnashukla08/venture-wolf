import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ForecastRequest } from './types';
import { theme } from '../../constants/theme';

interface ForecastFormProps {
  onSubmit: (data: ForecastRequest) => void;
  onBack: () => void;
  sectorChangedWarning?: boolean;
}

export const ForecastForm: React.FC<ForecastFormProps> = ({ onSubmit, onBack, sectorChangedWarning }) => {
  const [companyName, setCompanyName] = useState('');
  const [archetype, setArchetype] = useState<ForecastRequest['archetype']>('SAAS');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        let cached = null;
        if (Platform.OS === 'web') {
          cached = window.localStorage.getItem('@draft_profile_cache');
        } else {
          cached = await AsyncStorage.getItem('@draft_profile_cache').catch(() => null);
        }
        
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.pitch) setDescription(parsed.pitch);
          
          if (parsed.sector) {
            const sector = parsed.sector.toUpperCase();
            if (sector === 'MANUFACTURING') {
              setArchetype('MANUFACTURING');
            } else if (sector === 'SERVICES') {
              setArchetype('SERVICES');
            } else {
              setArchetype('SAAS');
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadProfileData();
  }, []);

  const handleSubmit = () => {
    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Please enter a company name.');
      return;
    }
    if (description.length < 10) {
      Alert.alert('Validation Error', 'Please provide a more descriptive background (at least 10 characters).');
      return;
    }
    onSubmit({ companyName, archetype, description });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Forecast</Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={styles.subtitle}>Let the AI CFO generate your 60-month model</Text>
      </View>

      {sectorChangedWarning && (
        <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="warning" size={24} color="#F59E0B" style={{ marginRight: 12 }} />
          <Text style={{ flex: 1, color: '#D97706', fontSize: 13, lineHeight: 18, fontWeight: 'bold' }}>
            You have to generate a new financial forecast as you have changed your sector.
          </Text>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>COMPANY NAME</Text>
        <TextInput 
          style={styles.input}
          placeholder="Acme Corp"
          placeholderTextColor={theme.colors.darkTextMuted}
          value={companyName}
          onChangeText={setCompanyName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>BUSINESS ARCHETYPE (LOCKED TO PROFILE)</Text>
        <View style={styles.segmentContainer}>
          <View style={[styles.segmentButton, styles.segmentButtonActive, { flex: 1, opacity: 0.9 }]}>
            <Ionicons name="lock-closed" size={12} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={[styles.segmentText, styles.segmentTextActive, { fontSize: 12 }]}>
              {archetype}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>BUSINESS DESCRIPTION</Text>
        <TextInput 
          style={[styles.input, styles.textArea]}
          placeholder="Describe your business model, target market, and pricing strategy..."
          placeholderTextColor={theme.colors.darkTextMuted}
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Generate Forecast</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  headerContainer: {
    marginBottom: theme.spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.darkTextMuted,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.darkSurface,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    borderRadius: theme.borderRadius.inner,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.darkText,
  },
  textArea: {
    height: 120,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.inner,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.darkBackground,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.darkTextMuted,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#0F172A', // Dark text for contrast against primary color
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  submitButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
