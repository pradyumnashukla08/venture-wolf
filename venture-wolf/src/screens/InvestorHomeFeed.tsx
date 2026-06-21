import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export const InvestorHomeFeed = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.topNavRow}>
        {navigation.canGoBack?.() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>
          WowFund is crafting the ultimate Investor Dashboard experience. Stay tuned—this feature is coming soon!
        </Text>
        {/* If the user is stuck, give them a way out to go back or sign out if no back nav */}
        {!navigation.canGoBack?.() && (
          <TouchableOpacity style={styles.goBackAltBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.goBackAltText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground || '#0F172A',
  },
  topNavRow: {
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.darkSurface || '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.darkBorder || '#334155',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.darkText || '#F8FAFC',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.darkTextMuted || '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  goBackAltBtn: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  goBackAltText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
