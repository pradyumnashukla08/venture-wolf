import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Alert, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

WebBrowser.maybeCompleteAuthSession();

// Conditionally load GoogleSignin
let GoogleSignin: any;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: '204151638622-1ltg84oqgnh8r6cbgjadpqo2606ks7bv.apps.googleusercontent.com',
  });
} catch (e) {
  console.log('GoogleSignin native module not found');
}

export const AuthBottomSheet = ({ visible, onClose, onLoginSuccess }: { visible: boolean; onClose: () => void; onLoginSuccess: () => void }) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 800;
  const { login } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [loadingGoogle, setLoadingGoogle] = React.useState(false);

  if (!visible) return null;

  const handleGoogleSignIn = async () => {
    try {
      if (!GoogleSignin) {
        Alert.alert('Notice', 'Google Sign-In requires a native APK build. It does not work inside the Expo Go app.');
        return;
      }
      setLoadingGoogle(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) throw new Error('No ID token found');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      
      onClose();
      login();
      navigation.replace('FounderProfile');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
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
          
          <Text style={styles.footerText}>By continuing, you agree to WaouFund's Terms of Service and Privacy Policy.</Text>
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
