import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

const LOADING_PHRASES = [
  "Securing Mumbai VC partner review...",
  "Applying strict structural guardrails...",
  "Injecting localized statutory tax models...",
  "Stress-testing the Worst Case scenario...",
  "Evaluating 60-month cash flows...",
  "Finalizing Excel workbook structure...",
];

export const ForecastLoading = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      <Text style={styles.phrase}>{LOADING_PHRASES[phraseIndex]}</Text>
      <Text style={styles.subtext}>This may take up to 30 seconds</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  spinner: {
    marginBottom: theme.spacing.lg,
  },
  phrase: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.darkText,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtext: {
    fontSize: 12,
    color: theme.colors.darkTextMuted,
    textAlign: 'center',
  },
});
