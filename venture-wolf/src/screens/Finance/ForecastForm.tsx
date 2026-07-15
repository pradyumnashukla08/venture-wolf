import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { ForecastRequest } from './types';
import { theme } from '../../constants/theme';

interface ForecastFormProps {
  onSubmit: (data: ForecastRequest) => void;
}

export const ForecastForm: React.FC<ForecastFormProps> = ({ onSubmit }) => {
  const [companyName, setCompanyName] = useState('');
  const [archetype, setArchetype] = useState<ForecastRequest['archetype']>('SAAS');
  const [description, setDescription] = useState('');

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

  const renderArchetypeButton = (type: ForecastRequest['archetype']) => {
    const isActive = archetype === type;
    return (
      <TouchableOpacity 
        style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
        onPress={() => setArchetype(type)}
        key={type}
      >
        <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
          {type}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Financial Forecast</Text>
        <Text style={styles.subtitle}>Let the AI CFO generate your 60-month model</Text>
      </View>

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
        <Text style={styles.label}>BUSINESS ARCHETYPE</Text>
        <View style={styles.segmentContainer}>
          {renderArchetypeButton('SAAS')}
          {renderArchetypeButton('MANUFACTURING')}
          {renderArchetypeButton('SERVICES')}
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
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.darkTextMuted,
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
