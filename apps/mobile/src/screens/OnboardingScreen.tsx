import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

export const OnboardingScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/wowfund_logo.jpeg')} 
            style={{ width: 100, height: 100, borderRadius: 20, marginBottom: 12 }} 
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>WAOUFUND</Text>
        </View>

        <View style={styles.heroTextContainer}>
          <Text style={styles.heroText}>Raise Capital.</Text>
          <Text style={styles.heroText}>Faster.</Text>
          <Text style={styles.heroSubtext}>
            AI-Powered Insights. Investor Network. Real Funding.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp', { role: 'founder' })}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={{ alignItems: 'center', marginTop: 32 }} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: theme.colors.darkTextMuted, fontSize: 14 }}>
            Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🛡️ Backed by WaouFund Network</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  wolfLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.darkSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
  },
  wolfText: {
    fontSize: 40,
  },
  brandTitle: {
    color: theme.colors.darkText,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: theme.colors.darkTextMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  heroTextContainer: {
    marginVertical: 48,
  },
  heroText: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.darkText,
    lineHeight: 56,
  },
  heroSubtext: {
    color: theme.colors.darkTextMuted,
    fontSize: 16,
    marginTop: 24,
    lineHeight: 24,
  },
  actionContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.darkText,
    fontSize: 16,
    fontWeight: 'bold',
  },

  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    color: theme.colors.darkTextMuted,
    fontSize: 12,
  },
});
