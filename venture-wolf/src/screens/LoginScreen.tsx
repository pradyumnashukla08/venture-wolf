import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      // Explicitly redirect to profile upon successful sign in
      navigation.navigate('Profile');
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
      
      // Use expo-linking to generate a robust deep link URI that works seamlessly 
      // in both Expo Go (exp://.../--/auth) and Production (venturewolf://auth)
      const redirectUrl = Linking.createURL('auth');
      console.log('=============================================');
      console.log('EXACT REDIRECT URL FOR SUPABASE:');
      console.log(redirectUrl);
      console.log('=============================================');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          // Bulletproof manual extraction of tokens, bypassing Linking.parse quirks
          const getParam = (name: string) => {
            const match = result.url.match(new RegExp(`[#?&]${name}=([^&]+)`));
            return match ? decodeURIComponent(match[1]) : null;
          };

          const access_token = getParam('access_token');
          const refresh_token = getParam('refresh_token');
          const code = getParam('code');
          const error = getParam('error');
          const error_description = getParam('error_description');

          if (error || error_description) {
            throw new Error(error_description || error || 'Unknown OAuth Error');
          }

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });
            if (sessionError) throw sessionError;
            navigation.navigate('Profile');
          } else if (code) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) throw sessionError;
            navigation.navigate('Profile');
          } else {
            throw new Error('No authentication token found in URL: ' + result.url);
          }
        }
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const msg = err.message || 'An unexpected error occurred';
      if (msg.includes('URL not allowed') || msg.includes('redirect_uri_mismatch') || msg.toLowerCase().includes('redirect')) {
        Alert.alert(
          'Server Configuration Required',
          `Your Supabase project is rejecting the redirect.\n\nPlease add this exact URL to your Supabase Auth -> URL Configuration settings:\n\n${Linking.createURL('auth')}`
        );
      } else {
        Alert.alert('Google Sign In Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            <TextInput 
              style={styles.input} 
              placeholder="••••••••" 
              placeholderTextColor={theme.colors.darkTextMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
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
