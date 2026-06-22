import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AIDisclaimer = ({ dark = false }: { dark?: boolean }) => {
  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <Ionicons name="information-circle-outline" size={14} color={dark ? '#94A3B8' : '#64748B'} style={styles.icon} />
      <Text style={[styles.text, dark && styles.textDark]}>
        AI-generated insights are for coaching purposes only and may contain inaccuracies. Please verify all strategic and financial data.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 24,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  textDark: {
    color: '#94A3B8',
  },
});
