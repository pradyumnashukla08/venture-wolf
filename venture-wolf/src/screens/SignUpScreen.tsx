import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  SignUp: { role: 'founder' | 'investor' };
};

export const SignUpScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SignUp'>>();
  const role = route.params?.role || 'founder'; // Default to founder if undefined
  
  const { setRoleOffline } = useAuth(); // We will add this to AuthContext next

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }
    
    setLoading(true);
    
    // We pass the role directly into Supabase User Metadata during Sign Up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_role: role,
        }
      }
    });

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      if (data.session) {
        if (setRoleOffline) {
          await setRoleOffline(role);
        }
        navigation.replace('FounderProfile');
      } else {
        // Fallback: try to manually sign in just in case the session wasn't auto-returned
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInData?.session) {
          if (setRoleOffline) {
            await setRoleOffline(role);
          }
          navigation.replace('FounderProfile');
        } else {
          // If we reach here, Supabase is strictly enforcing Email Confirmations
          Alert.alert(
            'Verification Required', 
            'Your account was created successfully, but your Supabase project requires Email Confirmation.\n\nPlease check your email to verify your account, or turn off "Confirm email" in your Supabase dashboard to allow instant login.'
          );
          navigation.replace('Login');
        }
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create {role === 'founder' ? 'Founder' : 'Investor'} Account</Text>
          <Text style={styles.subtitle}>Join the WowFund network</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Rahul Sharma" 
              placeholderTextColor={theme.colors.darkTextMuted}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
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
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton, { flex: 1 }]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
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
  headerContainer: {
    marginBottom: 40,
  },
  backButton: {
    marginBottom: 24,
  },
  backText: {
    color: theme.colors.darkTextMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.darkText,
    marginBottom: 8,
    letterSpacing: 0.5,
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
  disabledButton: {
    opacity: 0.7,
  },
});
