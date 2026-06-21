import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { ScoreRing } from './ScoreRing';

interface StartupCardProps {
  startup: {
    name: string;
    category: string;
    founder: string;
    location: string;
    mrr: string;
    burn: string;
    growth: string;
    fundabilityScore: number;
  };
}

export const StartupCard: React.FC<StartupCardProps> = ({ startup }) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.startupName}>{startup.name}</Text>
          <Text style={styles.startupCategory}>{startup.category}</Text>
        </View>
        <ScoreRing score={startup.fundabilityScore} />
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>MRR</Text>
          <Text style={styles.metricValue}>{startup.mrr}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Burn</Text>
          <Text style={styles.metricValue}>{startup.burn}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Growth</Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{startup.growth}</Text>
        </View>
      </View>
      
      <View style={styles.founderInfo}>
        <Text style={styles.founderText}>Founder: {startup.founder} • {startup.location}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.colors.darkSurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  startupName: {
    color: theme.colors.darkText,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  startupCategory: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  metricBox: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#9CA3AF', // Gray-400 for labels
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    color: theme.colors.darkText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  founderInfo: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkBackground,
    paddingTop: 8,
  },
  founderText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
