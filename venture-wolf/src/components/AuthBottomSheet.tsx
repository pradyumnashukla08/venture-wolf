import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Alert, ActivityIndicator } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const AuthBottomSheet = ({ visible, onClose, onLoginSuccess }: { visible: boolean; onClose: () => void; onLoginSuccess: () => void }) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 800;
  const { login } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [loadingGoogle, setLoadingGoogle] = React.useState(false);

  if (!visible) return null;
  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      
      const redirectUrl = Linking.createURL('/auth/callback');
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
      if (!data?.url) throw new Error('Failed to generate OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const extractParams = (url: string) => {
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          return {
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
          };
        };

        const { access_token, refresh_token } = extractParams(result.url);

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ 
            access_token, 
            refresh_token 
          });
          if (sessionError) throw sessionError;
          onClose();
          navigation.replace('FounderProfile');
        } else {
          throw new Error('Could not extract access_token from callback URL');
        }
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      Alert.alert('Google Sign In Failed', err.message || 'An unexpected error occurred');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.sheetContainer, { width: isTablet ? 600 : '100%', alignSelf: 'center' }]}>
          <View style={styles.dragHandle} />
          
          <Text style={styles.headerTitle}>Unlock the Syndicate</Text>
          <Text style={styles.headerSub}>Sign in to access AI Due Diligence, Market Vectors, and the full ecosystem.</Text>
          
          <TouchableOpacity activeOpacity={0.8} style={[styles.authButton, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1 }]} onPress={handleGoogleSignIn} disabled={loadingGoogle}>
            {loadingGoogle ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={[styles.authText, { color: '#0F172A' }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.authButton, { backgroundColor: '#0F172A', borderColor: '#0F172A', borderWidth: 1 }]} 
            onPress={() => {
              onClose();
              navigation.navigate('Login');
            }}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={[styles.authText, { color: '#FFFFFF' }]}>Continue with Email</Text>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>By continuing, you agree to WowFund's Terms of Service and Privacy Policy.</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    paddingBottom: 48,
    ...theme.shadows.premiumLight,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  authText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
