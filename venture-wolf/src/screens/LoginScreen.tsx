import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      // Manually push to the onboarding funnel now that App.tsx doesn't dynamically swap stacks
      navigation.replace('FounderProfile');
    }
    setLoading(false);
  };

  const handleSignUpNavigation = () => {
    navigation.navigate('Onboarding');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email to reset your password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password reset instructions sent to your email.');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // 1. Create a bulletproof redirect URL that works in both Expo Go and native APKs
      const redirectUrl = Linking.createURL('/auth/callback');

      // 2. Ask Supabase for the Google Login URL, but STRICTLY DO NOT open it automatically
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // This prevents the catastrophic Expo Go reload crash
          queryParams: { prompt: 'select_account' }
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to generate OAuth URL');

      // 3. Open the browser sandbox manually
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      // 4. Safely intercept the return URL and manually extract the tokens
      if (result.type === 'success' && result.url) {
        // Helper function to extract fragments (#access_token=...) safely
        const extractParams = (url: string) => {
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          return {
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
          };
        };

        const { access_token, refresh_token } = extractParams(result.url);

        // 5. Forcefully inject the session into Supabase local storage
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) throw sessionError;
          navigation.replace('FounderProfile');
        } else {
          throw new Error('Could not extract access_token from callback URL');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      Alert.alert('Google Sign In Failed', err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoMark}>🐺</Text>
            <Text style={styles.title}>WowFund</Text>
            <Text style={styles.subtitle}>THE SYNDICATE PROTOCOL</Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity 
              style={[styles.googleButton, loading && styles.disabledButton]} 
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput 
                style={styles.input} 
                placeholder="founder@startup.com" 
                placeholderTextColor={theme.colors.darkTextMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.passwordInput} 
                  placeholder="••••••••" 
                  placeholderTextColor={theme.colors.darkTextMuted}
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIconContainer}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={theme.colors.darkTextMuted} 
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignItems: 'flex-end', marginTop: 8 }} disabled={loading}>
                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' }}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.primaryButton, loading && styles.disabledButton, { flex: 1 }]} 
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={{ alignItems: 'center', marginTop: 24 }} 
              onPress={handleSignUpNavigation}
              disabled={loading}
            >
              <Text style={{ color: theme.colors.darkTextMuted, fontSize: 14 }}>
                Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Create One</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoMark: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.darkBorder,
  },
  dividerText: {
    color: theme.colors.darkTextMuted,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.darkTextMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.darkSurface,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.darkText,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkSurface,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: theme.colors.darkText,
  },
  eyeIconContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
