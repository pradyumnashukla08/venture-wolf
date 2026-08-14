import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, useWindowDimensions, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { Ionicons } from '@expo/vector-icons';
import { FundingStage } from '../types/schema';
import { useAuth } from '../context/AuthContext';
import { useProfileStore } from '../store/useProfileStore';
import { apiClient } from '../services/apiClient';
import { supabase } from '../lib/supabase';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { AIDisclaimer } from '../components/AIDisclaimer';
import { useProfileForm, validateLinkedIn, validateUrl } from '../hooks/useProfileForm';

const AISparkleInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  multiline = false, 
  contextData,
  instruction,
  keyboardType = 'default',
  description
}: { 
  label: string, 
  value: string, 
  onChangeText: (text: string) => void, 
  placeholder: string, 
  multiline?: boolean, 
  contextData?: any,
  instruction?: string,
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url',
  description?: string
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleSparkle = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Call the Groq Backend
    apiClient.post('/generate', { fieldLabel: label, context: contextData, instruction })
      .then(response => {
        onChangeText(response.data.result);
      })
      .catch(error => {
        console.error('AI Assist Error Object:', JSON.stringify(error, null, 2));
        console.error('AI Assist Error Message:', error.message);
        onChangeText("AI Engine is currently unavailable. Please try again later.");
      })
      .finally(() => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        setIsProcessing(false);
      });
  };

  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRowWithSparkle}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity activeOpacity={0.6} onPress={handleSparkle} style={styles.sparkleButton}>
          <Animated.View style={{ opacity: pulseAnim, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={14} color="#38BDF8" />
            <Text style={styles.sparkleText}>AI Assist</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
      <TextInput 
        style={[
          styles.input, 
          multiline && styles.textArea,
          isProcessing && { opacity: 0.5, backgroundColor: '#E2E8F0' }
        ]} 
        placeholder={placeholder} 
        placeholderTextColor="#94A3B8" 
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={!isProcessing}
        keyboardType={keyboardType}
        scrollEnabled={!multiline ? undefined : false}
      />
      {description && <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{description}</Text>}
    </View>
  );
};

export const FounderProfileEditor = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth, thirdWidth } = useResponsiveLayout();
  const { signOut, isProfileComplete, completeProfile } = useAuth();

  const {
    formData,
    isSaving,
    handleChange,
    addTeamMember,
    updateTeamMember,
    handleImageChange
  } = useProfileForm();

  return (
    <KeyboardAvoidingView 
      style={styles.fullScreen} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ResponsiveContainer>
        <ScrollView 
          style={styles.scrollContent} 
          contentContainerStyle={styles.scrollPadding} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          


          {/* TOP NAV */}
          <View style={styles.topNavRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={async () => {
                await signOut();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }} 
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* HEADER */}
          <View style={styles.profileHeaderBlock}>
            <View style={styles.profileHeaderImageContainer}>
              {formData.profileImage ? (
                <Image source={{ uri: formData.profileImage }} style={styles.profileHeaderImageCircle} contentFit="cover" transition={200} />
              ) : (
                <View style={styles.profileHeaderImageCircle}>
                  <Text style={styles.profileHeaderInitials}>
                    {formData.fullName ? formData.fullName.substring(0, 2).toUpperCase() : 'FD'}
                  </Text>
                </View>
              )}
              <TouchableOpacity activeOpacity={0.8} style={styles.editAvatarBadge} onPress={handleImageChange}>
                <Ionicons name="camera" size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileHeaderName}>{formData.fullName || 'Founder Profile'}</Text>
            <Text style={styles.profileHeaderRole}>
              {formData.role || 'CEO'}, {formData.companyName || 'Startup'}
            </Text>
          </View>

          {/* SECTION 1: FOUNDER IDENTITY */}
          <View style={[styles.sectionCard, theme.shadows.premiumLight]}>
            <Text style={styles.sectionTitle}>1. Founder Identity</Text>
            
            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>FULL LEGAL NAME</Text>
                <TextInput style={styles.input} placeholder="e.g., Rahul Sharma" placeholderTextColor="#94A3B8" value={formData.fullName} onChangeText={v => handleChange('fullName', v)} />
              </View>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>PRIMARY ROLE</Text>
                <TextInput style={styles.input} placeholder="e.g., CEO, Technical Founder" placeholderTextColor="#94A3B8" value={formData.role} onChangeText={v => handleChange('role', v)} />
              </View>
            </View>

            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>LINKEDIN URL</Text>
                <TextInput 
                  style={[styles.input, !validateLinkedIn(formData.linkedinUrl) && { borderColor: '#EF4444', borderWidth: 1 }]} 
                  placeholder="https://www.linkedin.com/in/rahul" 
                  placeholderTextColor="#94A3B8" 
                  value={formData.linkedinUrl} 
                  onChangeText={v => handleChange('linkedinUrl', v)}
                  onBlur={() => {
                    if (formData.linkedinUrl !== '' && !validateLinkedIn(formData.linkedinUrl)) {
                      handleChange('linkedinUrl', '');
                    }
                  }}
                  autoCapitalize="none" 
                />
                {!validateLinkedIn(formData.linkedinUrl) && formData.linkedinUrl !== '' && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a full LinkedIn URL (https://...)</Text>}
              </View>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput style={[styles.input, { backgroundColor: '#F8FAFC', color: '#64748B' }]} placeholder="email@example.com" value={formData.email} editable={false} autoCapitalize="none" />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16, marginBottom: 12 }]}>KEY TEAM MEMBERS ({formData.team.length}/4)</Text>
            {formData.team.map((member, idx) => (
              <View key={idx} style={{ marginBottom: 12 }}>
                <View style={styles.teamMemberRow}>
                  <TextInput style={[styles.input, { flex: 2, marginRight: 8 }]} placeholder="Name" placeholderTextColor="#94A3B8" value={member.name} onChangeText={v => updateTeamMember(idx, 'name', v)} />
                  <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Role" placeholderTextColor="#94A3B8" value={member.role} onChangeText={v => updateTeamMember(idx, 'role', v)} />
                  <TextInput 
                    style={[styles.input, { flex: 2 }, !validateLinkedIn(member.linkedin) && { borderColor: '#EF4444', borderWidth: 1 }]} 
                    placeholder="https://linkedin.com/in/..." 
                    placeholderTextColor="#94A3B8" 
                    value={member.linkedin} 
                    onChangeText={v => updateTeamMember(idx, 'linkedin', v)}
                    onBlur={() => {
                      if (member.linkedin !== '' && !validateLinkedIn(member.linkedin)) {
                        updateTeamMember(idx, 'linkedin', '');
                      }
                    }}
                    autoCapitalize="none" 
                  />
                </View>
                {!validateLinkedIn(member.linkedin) && member.linkedin !== '' && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a full LinkedIn URL (https://...)</Text>}
              </View>
            ))}
            {formData.team.length < 4 && (
              <TouchableOpacity activeOpacity={0.7} onPress={addTeamMember} style={styles.dashedButton}>
                <Text style={styles.dashedButtonText}>+ ADD TEAM MEMBER</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SECTION 2: STARTUP CORE & COMPLIANCE */}
          <View style={[styles.sectionCard, theme.shadows.premiumLight]}>
            <Text style={styles.sectionTitle}>2. Startup Core & Compliance</Text>
            
            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>COMPANY LEGAL NAME</Text>
                <TextInput style={styles.input} placeholder="e.g., WaouFund Inc." placeholderTextColor="#94A3B8" value={formData.companyName} onChangeText={v => handleChange('companyName', v)} />
              </View>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>IS COMPANY REGISTERED?</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => handleChange('isRegistered', true)}
                    style={[styles.outlineButton, { flex: 1, backgroundColor: formData.isRegistered ? '#0F172A' : 'transparent', borderColor: formData.isRegistered ? '#0F172A' : '#E2E8F0', marginBottom: 0 }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: formData.isRegistered ? '#FFF' : '#475569' }]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => handleChange('isRegistered', false)}
                    style={[styles.outlineButton, { flex: 1, backgroundColor: !formData.isRegistered ? '#0F172A' : 'transparent', borderColor: !formData.isRegistered ? '#0F172A' : '#E2E8F0', marginBottom: 0 }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: !formData.isRegistered ? '#FFF' : '#475569' }]}>Not Yet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>STARTUP WEBSITE</Text>
              <TextInput 
                style={styles.input} 
                placeholder="https://yourstartup.com" 
                placeholderTextColor="#94A3B8" 
                value={formData.websiteUrl} 
                onChangeText={v => handleChange('websiteUrl', v)} 
                autoCapitalize="none" 
                keyboardType="url"
              />
            </View>

            {formData.isRegistered && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>REGISTRATION / GSTIN</Text>
                <TextInput style={styles.input} placeholder="27AAAAA0000A1Z5" placeholderTextColor="#94A3B8" value={formData.registrationNo} onChangeText={v => handleChange('registrationNo', v)} />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SECTOR / VERTICAL</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {['SaaS', 'FinTech', 'HealthTech', 'Consumer', 'Manufacturing', 'Services'].map(sector => (
                  <TouchableOpacity 
                    key={sector} 
                    activeOpacity={0.7}
                    onPress={() => handleChange('sector', sector)}
                    style={[styles.outlineButton, { backgroundColor: formData.sector === sector ? '#0F172A' : 'transparent', borderColor: formData.sector === sector ? '#0F172A' : '#E2E8F0' }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: formData.sector === sector ? '#FFF' : '#475569' }]}>{sector}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CURRENT FUNDING STAGE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {(['Pre-Seed', 'Seed', 'Series-A', 'Series-B'] as FundingStage[]).map(stage => (
                  <TouchableOpacity 
                    key={stage} 
                    activeOpacity={0.7}
                    onPress={() => handleChange('stage', stage)}
                    style={[styles.outlineButton, { backgroundColor: formData.stage === stage ? '#0F172A' : 'transparent', borderColor: formData.stage === stage ? '#0F172A' : '#E2E8F0' }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: formData.stage === stage ? '#FFF' : '#475569' }]}>{stage}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>BASE CURRENCY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {['₹ (INR)', '$ (USD)', '€ (EUR)', '£ (GBP)'].map(curr => (
                  <TouchableOpacity 
                    key={curr} 
                    activeOpacity={0.7}
                    onPress={() => handleChange('currency', curr)}
                    style={[styles.outlineButton, { backgroundColor: formData.currency === curr ? '#0F172A' : 'transparent', borderColor: formData.currency === curr ? '#0F172A' : '#E2E8F0' }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: formData.currency === curr ? '#FFF' : '#475569' }]}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <AISparkleInput 
              label="ONE-LINER PITCH" 
              placeholder="Explain what you do in one clear sentence..." 
              multiline={true} 
              value={formData.pitch} 
              onChangeText={v => handleChange('pitch', v)}
              contextData={formData}
              instruction="Write ONLY a single, short sentence (max 15 words) that explains the core value proposition. Do NOT write a paragraph."
            />
          </View>

          {/* SECTION 3: MARKET & COMPETITORS */}
          <View style={[styles.sectionCard, theme.shadows.premiumLight]}>
            <Text style={styles.sectionTitle}>3. Market & Competitors</Text>
            
            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={{ width: thirdWidth }}>
                <AISparkleInput 
                  label="TAM (Total Addressable Market)" 
                  placeholder="e.g., 5000000000" 
                  value={formData.tam} 
                  onChangeText={v => handleChange('tam', v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  contextData={{ sector: formData.sector, pitch: formData.pitch, currency: formData.currency }}
                  instruction="Output ONLY a raw integer number representing the TAM. For example: 5000000000. Do NOT output currency symbols, text, or explanations."
                  description="Total revenue opportunity if 100% market share is achieved."
                />
              </View>
              <View style={{ width: thirdWidth }}>
                <AISparkleInput 
                  label="SAM (Serviceable Available Market)" 
                  placeholder="e.g., 1500000000" 
                  value={formData.sam} 
                  onChangeText={v => handleChange('sam', v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  contextData={{ sector: formData.sector, pitch: formData.pitch, tam: formData.tam, currency: formData.currency }}
                  instruction="Output ONLY a raw integer number representing the SAM. For example: 1500000000. Do NOT output currency symbols, text, or explanations."
                  description="The segment of the TAM targeted by your products/services."
                />
              </View>
              <View style={{ width: thirdWidth }}>
                <AISparkleInput 
                  label="SOM (Serviceable Obtainable Market)" 
                  placeholder="e.g., 250000000" 
                  value={formData.som} 
                  onChangeText={v => handleChange('som', v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  contextData={{ sector: formData.sector, pitch: formData.pitch, tam: formData.tam, sam: formData.sam, currency: formData.currency }}
                  instruction="Output ONLY a raw integer number representing the SOM. For example: 250000000. Do NOT output currency symbols, text, or explanations."
                  description="The realistic portion of the SAM you can capture."
                />
              </View>
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.label}>TOP 3 COMPETITORS (WEBSITE LINKS - MIN 2)</Text>
              <View style={{ flexDirection: 'column', gap: 12 }}>
                <View>
                  <TextInput 
                    style={[styles.input, !validateUrl(formData.competitor1) && { borderColor: '#EF4444', borderWidth: 1 }]} 
                    placeholder="e.g. competitor.com" 
                    placeholderTextColor="#94A3B8" 
                    value={formData.competitor1} 
                    onChangeText={v => handleChange('competitor1', v)} 
                    keyboardType="url"
                    autoCapitalize="none"
                    onBlur={() => {
                      if (formData.competitor1 !== '' && !validateUrl(formData.competitor1)) {
                        handleChange('competitor1', '');
                      }
                    }}
                  />
                  {!validateUrl(formData.competitor1) && formData.competitor1 !== '' && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a valid website URL</Text>}
                </View>
                
                <View>
                  <TextInput 
                    style={[styles.input, !validateUrl(formData.competitor2) && { borderColor: '#EF4444', borderWidth: 1 }]} 
                    placeholder="e.g. rival.in" 
                    placeholderTextColor="#94A3B8" 
                    value={formData.competitor2} 
                    onChangeText={v => handleChange('competitor2', v)} 
                    keyboardType="url"
                    autoCapitalize="none"
                    onBlur={() => {
                      if (formData.competitor2 !== '' && !validateUrl(formData.competitor2)) {
                        handleChange('competitor2', '');
                      }
                    }}
                  />
                  {!validateUrl(formData.competitor2) && formData.competitor2 !== '' && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a valid website URL</Text>}
                </View>

                <View>
                  <TextInput 
                    style={[styles.input, !validateUrl(formData.competitor3) && { borderColor: '#EF4444', borderWidth: 1 }]} 
                    placeholder="e.g. startup.tech (Optional)" 
                    placeholderTextColor="#94A3B8" 
                    value={formData.competitor3} 
                    onChangeText={v => handleChange('competitor3', v)} 
                    keyboardType="url"
                    autoCapitalize="none"
                    onBlur={() => {
                      if (formData.competitor3 !== '' && !validateUrl(formData.competitor3)) {
                        handleChange('competitor3', '');
                      }
                    }}
                  />
                  {!validateUrl(formData.competitor3) && formData.competitor3 !== '' && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a valid website URL</Text>}
                </View>
              </View>
            </View>

            <AISparkleInput 
              label="CORE DISTRIBUTION MOAT" 
              placeholder="How do you acquire customers cheaper than competitors?" 
              multiline={true} 
              value={formData.distributionMoat} 
              onChangeText={v => handleChange('distributionMoat', v)}
              contextData={{ competitors: [formData.competitor1, formData.competitor2, formData.competitor3], sector: formData.sector, pitch: formData.pitch }}
              instruction="Write ONLY 1-2 short sentences defining the distribution moat. Do NOT write a paragraph."
              description="Your unique advantage in acquiring customers at a lower cost or faster rate than competitors."
            />
          </View>

          {/* SECTION 4: THE FUNDRAISING ASK */}
          <View style={[styles.sectionCard, theme.shadows.premiumLight]}>
            <Text style={styles.sectionTitle}>4. The Fundraising Ask</Text>
            
            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>{`TARGET RAISE (${(formData.currency || '₹ (INR)').split(' ')[0]})`}</Text>
                <TextInput style={[styles.input, styles.heavyInput]} placeholder="e.g., 2000000" placeholderTextColor="#94A3B8" value={formData.targetRaise} onChangeText={v => handleChange('targetRaise', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Total capital you are looking to raise in this round.</Text>
              </View>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>{`VALUATION CAP (${(formData.currency || '₹ (INR)').split(' ')[0]})`}</Text>
                <TextInput style={[styles.input, styles.heavyInput]} placeholder="e.g., 20000000" placeholderTextColor="#94A3B8" value={formData.valuationCap} onChangeText={v => handleChange('valuationCap', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Maximum valuation at which your SAFE/Note will convert.</Text>
              </View>
            </View>
            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
              <View style={[styles.inputGroup, { width: halfWidth }]}>
                <Text style={styles.label}>EQUITY OFFERED (%)</Text>
                <TextInput style={[styles.input, styles.heavyInput]} placeholder="e.g., 10-15%" placeholderTextColor="#94A3B8" value={formData.equityOffered} onChangeText={v => handleChange('equityOffered', v)} keyboardType="numeric" />
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Percentage of company being sold. Typical range: 10% to 15%.</Text>
              </View>
              <View style={{ width: halfWidth }}>
                <AISparkleInput
                  label={`COMMITTED SO FAR (${(formData.currency || '₹ (INR)').split(' ')[0]})`}
                  placeholder="e.g., 5000000"
                  value={formData.capitalCommitted}
                  onChangeText={v => handleChange('capitalCommitted', v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  contextData={{ targetRaise: formData.targetRaise, sector: formData.sector, currency: formData.currency }}
                  instruction="Output ONLY a raw integer number representing capital already committed based on the target raise. For example: 5000000. Do NOT output currency symbols, commas, words, or text like 'L' or 'Cr'."
                  description="Amount of the target raise already committed by investors."
                />
              </View>
            </View>
          </View>

          {/* SECTION 5: DYNAMIC STAGE-AWARE TRACTION METRICS */}
          <View style={[styles.sectionCard, theme.shadows.premiumLight, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>5. Traction Metrics ({formData.stage})</Text>
            
            {formData.stage === 'Pre-Seed' && (
              <>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="WAITLIST COUNT"
                      placeholder="e.g., 500"
                      value={formData.waitlistCount}
                      onChangeText={v => handleChange('waitlistCount', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage }}
                      instruction="Generate a realistic waitlist count for a Pre-Seed startup. Output ONLY the raw integer number."
                      description="Number of potential customers who have signed up."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="BETA CONVERSION (%)"
                      placeholder="e.g., 10"
                      value={formData.betaConversion}
                      onChangeText={v => handleChange('betaConversion', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage }}
                      instruction="Generate a realistic beta conversion rate percentage. Output ONLY the raw integer number."
                      description="Percentage of waitlist users converting to active users."
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PRODUCT STATUS</Text>
                  <View style={{ flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {['Concept Only', 'Mockups', 'Functional MVP'].map(status => (
                      <TouchableOpacity 
                        key={status} 
                        activeOpacity={0.7}
                        onPress={() => handleChange('productStatus', status)}
                        style={[styles.outlineButton, { backgroundColor: formData.productStatus === status ? '#0F172A' : 'transparent', borderColor: formData.productStatus === status ? '#0F172A' : '#E2E8F0', paddingVertical: 12 }]}
                      >
                        <Text style={[styles.outlineButtonText, { color: formData.productStatus === status ? '#FFF' : '#475569', fontSize: 13 }]}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Current stage of your product's development.</Text>
                </View>
                <AISparkleInput
                  label="THE PROBLEM (Validation)"
                  placeholder="What specific problem are you solving, and how do you know it exists?"
                  value={formData.problemValidation}
                  onChangeText={v => handleChange('problemValidation', v)}
                  multiline={true}
                  contextData={{ sector: formData.sector, pitch: formData.pitch }}
                  instruction="Write a concise 2-sentence description of a critical problem in this sector and how it's validated."
                  description="The pain point your product addresses and how you validated it."
                />
                <AISparkleInput
                  label="THE TEAM (Capability)"
                  placeholder="Who are the core founders and what is your domain expertise?"
                  value={formData.teamCapability}
                  onChangeText={v => handleChange('teamCapability', v)}
                  multiline={true}
                  contextData={{ sector: formData.sector, pitch: formData.pitch }}
                  instruction="Write a concise 2-sentence description of an ideal founding team's expertise for this startup."
                  description="Why your team has the right expertise to execute this idea."
                />
                <View style={{ width: halfWidth }}>
                  <AISparkleInput
                    label="CURRENT RUNWAY (MONTHS)"
                    placeholder="e.g., 6"
                    value={formData.runway}
                    onChangeText={v => handleChange('runway', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    contextData={{ stage: formData.stage }}
                    instruction="Generate a realistic runway in months for a Pre-Seed startup. Output ONLY the raw integer number (e.g., 9)."
                    description="Number of months your current cash will last."
                  />
                </View>
              </>
            )}

            {formData.stage === 'Seed' && (
              <>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label={`CURRENT ARR / MRR (${(formData.currency || '₹ (INR)').split(' ')[0]})`}
                      placeholder="e.g., 500000"
                      value={formData.currentMrr}
                      onChangeText={v => handleChange('currentMrr', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector, stage: formData.stage, currency: formData.currency }}
                      instruction="Generate a realistic ARR/MRR for a Seed startup. Output ONLY the raw integer number."
                      description="Annual or Monthly Recurring Revenue."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="ACTIVE USERS"
                      placeholder="e.g., 1500"
                      value={formData.userTraction}
                      onChangeText={v => handleChange('userTraction', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector, stage: formData.stage }}
                      instruction="Generate realistic user/client traction for a Seed startup. Output ONLY the raw integer number (e.g., 1500)."
                      description="Total active users or clients currently on the platform."
                    />
                  </View>
                </View>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="MOM GROWTH %"
                      placeholder="e.g., 15"
                      value={formData.momGrowth}
                      onChangeText={v => handleChange('momGrowth', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage }}
                      instruction="Generate a realistic Month-over-Month growth rate for a Seed startup. Output ONLY the raw integer number (e.g., 15)."
                      description="Month-over-Month Growth."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="GROSS MARGIN %"
                      placeholder="e.g., 70"
                      value={formData.grossMargin}
                      onChangeText={v => handleChange('grossMargin', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector }}
                      instruction="Generate a realistic Gross Margin percentage for this sector. Output ONLY the raw integer number (e.g., 70)."
                      description="Revenue minus cost of goods sold, divided by revenue."
                    />
                  </View>
                </View>
                <View style={{ width: halfWidth }}>
                  <AISparkleInput
                    label={`CUSTOMER ACQUISITION COST (CAC) ${(formData.currency || '₹ (INR)').split(' ')[0]}`}
                    placeholder="e.g., 500"
                    value={formData.cac}
                    onChangeText={v => handleChange('cac', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    contextData={{ sector: formData.sector, currency: formData.currency }}
                    instruction="Generate a realistic CAC for this sector. Output ONLY the raw integer number (e.g., 500)."
                    description="Cost to acquire a single customer."
                  />
                </View>
              </>
            )}

            {formData.stage === 'Series-A' && (
              <>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label={`MRR (${(formData.currency || '₹ (INR)').split(' ')[0]})`}
                      placeholder="e.g., 2500000"
                      value={formData.verifiedArr}
                      onChangeText={v => handleChange('verifiedArr', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage, sector: formData.sector, currency: formData.currency }}
                      instruction="Generate a realistic MRR for a Series-A startup. Output ONLY the raw integer number."
                      description="Monthly Recurring Revenue."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="CHURN RATE (%)"
                      placeholder="e.g., 5"
                      value={formData.churnRate}
                      onChangeText={v => handleChange('churnRate', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector }}
                      instruction="Generate a realistic Churn Rate percentage. Output ONLY the raw integer number."
                      description="Percentage of customers lost over a given period."
                    />
                  </View>
                </View>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={[styles.inputGroup, { width: halfWidth }]}>
                    <Text style={styles.label}>LTV TO CAC RATIO</Text>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                      {['<2:1', '2:1', '3:1', '>4:1'].map(ratio => (
                        <TouchableOpacity key={ratio} activeOpacity={0.7} onPress={() => handleChange('ltvcacRatio', ratio)} style={[styles.outlineButton, { flex: 1, backgroundColor: formData.ltvcacRatio === ratio ? '#0F172A' : 'transparent', borderColor: formData.ltvcacRatio === ratio ? '#0F172A' : '#E2E8F0', paddingHorizontal: 0 }]}>
                          <Text style={[styles.outlineButtonText, { color: formData.ltvcacRatio === ratio ? '#FFF' : '#475569', fontSize: 11 }]}>{ratio}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Lifetime Value to Customer Acquisition Cost ratio.</Text>
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label={`CUSTOMER ACQUISITION COST (CAC) ${(formData.currency || '₹ (INR)').split(' ')[0]}`}
                      placeholder="e.g., 1000"
                      value={formData.cacPayback}
                      onChangeText={v => handleChange('cacPayback', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector, currency: formData.currency }}
                      instruction="Generate a realistic CAC. Output ONLY the raw integer number (e.g., 1000)."
                      description="Cost to acquire a single customer."
                    />
                  </View>
                </View>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label={`CURRENT MONTHLY BURN (${(formData.currency || '₹ (INR)').split(' ')[0]})`}
                      placeholder="e.g., 1000000"
                      value={formData.burnRate}
                      onChangeText={v => handleChange('burnRate', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage, currency: formData.currency }}
                      instruction="Generate a realistic monthly burn rate for a Series-A startup. Output ONLY the raw integer number."
                      description="Amount spent monthly before generating positive cash flow."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="CURRENT RUNWAY (MONTHS)"
                      placeholder="e.g., 12"
                      value={formData.runway}
                      onChangeText={v => handleChange('runway', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage }}
                      instruction="Generate a realistic runway in months for a Series-A startup. Output ONLY the raw integer number (e.g., 18)."
                      description="Number of months until cash runs out."
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EXECUTIVE HIRING (DEDICATED HEADS)</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('execSales', !formData.execSales)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: formData.execSales ? '#0EA5E9' : '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        {formData.execSales && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                      <Text style={{ fontSize: 14, color: '#334155' }}>Sales</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('execEng', !formData.execEng)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: formData.execEng ? '#0EA5E9' : '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        {formData.execEng && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                      <Text style={{ fontSize: 14, color: '#334155' }}>Engineering</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('execMarketing', !formData.execMarketing)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: formData.execMarketing ? '#0EA5E9' : '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        {formData.execMarketing && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                      <Text style={{ fontSize: 14, color: '#334155' }}>Marketing</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>Which key leadership roles are already filled?</Text>
                </View>
              </>
            )}

            {formData.stage === 'Series-B' && (
              <>
                <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label={`TOTAL ANNUAL REVENUE (${(formData.currency || '₹ (INR)').split(' ')[0]})`}
                      placeholder="e.g., 250000000"
                      value={formData.annualRevenue}
                      onChangeText={v => handleChange('annualRevenue', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ stage: formData.stage, sector: formData.sector, currency: formData.currency }}
                      instruction="Generate a realistic total annual revenue for a Series-B startup. Output ONLY the raw integer number."
                      description="Total revenue generated over the past 12 months."
                    />
                  </View>
                  <View style={{ width: halfWidth }}>
                    <AISparkleInput
                      label="NET REVENUE RETENTION (NRR) %"
                      placeholder="e.g., 120"
                      value={formData.nrr}
                      onChangeText={v => handleChange('nrr', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      contextData={{ sector: formData.sector }}
                      instruction="Generate a realistic NRR percentage for a Series-B startup. Output ONLY the raw integer number."
                      description="Percentage of revenue retained from existing customers, including expansions/upsells."
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <Text style={styles.label}>LTV TO CAC RATIO</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {['<2:1', '2:1', '3:1', '>4:1'].map(ratio => (
                      <TouchableOpacity key={ratio} activeOpacity={0.7} onPress={() => handleChange('ltvcacRatio', ratio)} style={[styles.outlineButton, { flex: 1, backgroundColor: formData.ltvcacRatio === ratio ? '#0F172A' : 'transparent', borderColor: formData.ltvcacRatio === ratio ? '#0F172A' : '#E2E8F0', paddingHorizontal: 0 }]}>
                        <Text style={[styles.outlineButtonText, { color: formData.ltvcacRatio === ratio ? '#FFF' : '#475569', fontSize: 11 }]}>{ratio}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Lifetime Value to Customer Acquisition Cost ratio.</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EXPANSION VECTOR (Select all that apply)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {['International Expansion', 'New Product Lines', 'Mergers & Acquisitions'].map(vector => {
                      const isSelected = formData.expansionVectors.includes(vector);
                      return (
                        <TouchableOpacity 
                          key={vector} 
                          activeOpacity={0.7}
                          onPress={() => {
                            if (isSelected) {
                              handleChange('expansionVectors', formData.expansionVectors.filter(v => v !== vector));
                            } else {
                              handleChange('expansionVectors', [...formData.expansionVectors, vector]);
                            }
                          }}
                          style={[styles.outlineButton, { backgroundColor: isSelected ? '#0F172A' : 'transparent', borderColor: isSelected ? '#0F172A' : '#E2E8F0' }]}
                        >
                          <Text style={[styles.outlineButtonText, { color: isSelected ? '#FFF' : '#475569' }]}>{vector}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Strategies for scaling operations and revenue.</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>C-SUITE COMPLETENESS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ flex: 1, fontSize: 14, color: '#64748B' }}>Is your executive C-suite fully hired?</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('cSuiteComplete', true)} style={[styles.outlineButton, { flex: 0.5, marginRight: 8, backgroundColor: formData.cSuiteComplete ? '#0F172A' : 'transparent', borderColor: formData.cSuiteComplete ? '#0F172A' : '#E2E8F0', paddingVertical: 8, marginBottom: 0 }]}>
                      <Text style={[styles.outlineButtonText, { color: formData.cSuiteComplete ? '#FFF' : '#475569' }]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('cSuiteComplete', false)} style={[styles.outlineButton, { flex: 0.5, backgroundColor: !formData.cSuiteComplete ? '#0F172A' : 'transparent', borderColor: !formData.cSuiteComplete ? '#0F172A' : '#E2E8F0', paddingVertical: 8, marginBottom: 0 }]}>
                      <Text style={[styles.outlineButtonText, { color: !formData.cSuiteComplete ? '#FFF' : '#475569' }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>Indicates if all key executive roles are filled.</Text>
                </View>
                <View style={styles.inputGroup}>
                  <AISparkleInput
                    label="MARKET SHARE NICHE %"
                    placeholder="e.g., 15"
                    value={formData.marketShare}
                    onChangeText={v => handleChange('marketShare', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    contextData={{ sector: formData.sector }}
                    instruction="Generate a realistic market share percentage. Output ONLY the raw integer number."
                    description="Estimated percentage of your target market currently captured."
                  />
                </View>
              </>
            )}

            <AIDisclaimer />
          </View>
        </ScrollView>

        <View style={styles.stickyFooter}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={styles.primaryButton}
            onPress={() => {
              const validateForm = () => {
                const missing: string[] = [];

                // Identity & Core
                if (!formData.fullName) missing.push("Full Name");
                if (!formData.role) missing.push("Founder Role");
                if (!formData.linkedinUrl) missing.push("LinkedIn URL");
                if (!formData.companyName) missing.push("Company Name");
                if (!formData.pitch) missing.push("One-Liner Pitch");
                if (formData.isRegistered && !formData.registrationNo) missing.push("Registration Number");

                formData.team.forEach((member, i) => {
                  if (!member.name || !member.role) missing.push(`Team Member ${i + 1} (Name & Role)`);
                });

                // Market & Distribution
                if (!formData.tam) missing.push("TAM");
                if (!formData.sam) missing.push("SAM");
                if (!formData.som) missing.push("SOM");
                if (!formData.competitor1 || !validateUrl(formData.competitor1) || !formData.competitor2 || !validateUrl(formData.competitor2)) missing.push("Top 2 Competitors (Valid URLs)");
                if (!formData.distributionMoat) missing.push("Core Distribution Moat");

                // Fundraising Ask
                if (!formData.targetRaise) missing.push("Target Raise");
                if (!formData.valuationCap) missing.push("Valuation Cap");
                if (!formData.equityOffered) missing.push("Equity Offered");
                if (!formData.capitalCommitted) missing.push("Committed So Far");

                // Traction
                if (formData.stage === 'Pre-Seed') {
                  if (!formData.productStatus) missing.push("Product Status");
                  if (!formData.problemValidation) missing.push("Problem Validation");
                  if (!formData.teamCapability) missing.push("Team Capability");
                  if (!formData.runway) missing.push("Current Runway");
                } else if (formData.stage === 'Seed') {
                  if (!formData.currentMrr) missing.push("Current ARR / MRR");
                  if (!formData.userTraction) missing.push("User/Client Traction");
                  if (!formData.momGrowth) missing.push("MoM Growth %");
                  if (!formData.grossMargin) missing.push("Gross Margin %");
                  if (!formData.cac) missing.push("Customer Acquisition Cost");
                } else if (formData.stage === 'Series-A') {
                  if (!formData.verifiedArr) missing.push("Verified ARR");
                  if (!formData.nrr) missing.push("Net Revenue Retention (NRR) %");
                  if (!formData.ltvcacRatio) missing.push("LTV:CAC Ratio");
                  if (!formData.cacPayback) missing.push("CAC Payback Period");
                  if (!formData.burnRate) missing.push("Current Monthly Burn");
                  if (!formData.runway) missing.push("Current Runway");
                } else if (formData.stage === 'Series-B') {
                  if (!formData.annualRevenue) missing.push("Total Annual Revenue");
                  if (formData.expansionVectors.length === 0) missing.push("Expansion Vector (Select at least one)");
                  if (!formData.marketShare) missing.push("Market Share Niche %");
                }

                if (missing.length > 0) {
                  const errorMsg = `You must complete 100% of the profile before proceeding.\n\nMissing Fields:\n- ${missing.join('\n- ')}`;
                  if (Platform.OS === 'web') {
                    window.alert(errorMsg);
                  } else {
                    Alert.alert('Incomplete Profile', errorMsg);
                  }
                  return false;
                }
                return true;
              };

              if (!validateForm()) return;

              if (!isProfileComplete) {
                completeProfile();
                navigation.navigate('ImportCenter');
              } else {
                if (Platform.OS === 'web') {
                  window.alert('Profile saved successfully!');
                  navigation.navigate('ImportCenter');
                } else {
                  Alert.alert(
                    'Success', 
                    'Profile saved successfully! Would you like to proceed to the Data Room?',
                    [
                      { text: 'Stay Here', style: 'cancel' },
                      { text: 'Go to Data Room', onPress: () => navigation.navigate('ImportCenter') }
                    ]
                  );
                }
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {!isProfileComplete ? 'NEXT: BUILD DATA ROOM' : 'SAVE & SUBMIT PROFILE'}
            </Text>
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flex: 1 },
  scrollPadding: { padding: 24, paddingBottom: 120 },
  
  topNavRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 8 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  profileHeaderBlock: { alignItems: 'center', marginBottom: 40, marginTop: 8 },
  profileHeaderImageContainer: {
    marginBottom: 16, position: 'relative',
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  profileHeaderImageCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  profileHeaderInitials: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  editAvatarBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFFFFF', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  profileHeaderName: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  profileHeaderRole: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  savingBadge: { fontSize: 11, letterSpacing: 0.5, color: '#F59E0B', fontWeight: '900', marginTop: 16 },
  savedBadge: { fontSize: 11, letterSpacing: 0.5, color: '#10B981', fontWeight: '900', marginTop: 16 },
  
  sectionCard: { 
    marginBottom: 32, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 24, letterSpacing: -0.5 },
  
  inputGroup: { marginBottom: 20 },
  labelRowWithSparkle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  
  sparkleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sparkleText: { fontSize: 11, color: '#38BDF8', fontWeight: 'bold', marginLeft: 4, letterSpacing: 0.5 },

  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 16, fontSize: 16, color: '#0F172A', fontWeight: '500' },
  heavyInput: { fontSize: 24, fontWeight: 'bold' },
  textArea: { minHeight: 100 },
  
  outlineButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginBottom: 8 },
  outlineButtonText: { fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },
  
  dashedButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  dashedButtonText: { color: '#64748B', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
  
  teamMemberRow: { flexDirection: 'row', marginBottom: 12 },

  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  primaryButton: { backgroundColor: theme.colors.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
