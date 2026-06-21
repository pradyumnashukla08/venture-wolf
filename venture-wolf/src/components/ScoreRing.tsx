import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface ScoreRingProps {
  score: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score }) => {
  // Simple color logic based on deterministic score
  const getScoreColor = () => {
    if (score >= 90) return theme.colors.primary;
    if (score >= 80) return theme.colors.secondary;
    return '#F87171'; // Red-400
  };

  return (
    <View style={styles.container}>
      <View style={[styles.ring, { borderColor: getScoreColor() }]}>
        <Text style={[styles.scoreText, { color: getScoreColor() }]}>{score}</Text>
      </View>
      <Text style={styles.label}>Fundability</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
  },
  label: {
    color: theme.colors.darkText,
    fontSize: 10,
    opacity: 0.7,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
