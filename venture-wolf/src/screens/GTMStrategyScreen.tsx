// Forces IDE cache refresh
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import type { GTMStrategy } from '../types/evaluation';
import { useProfileStore } from '../store/useProfileStore';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';
import { AIDisclaimer } from '../components/AIDisclaimer';
import { apiClient } from '../services/apiClient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';

export const GTMStrategyScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet } = useResponsiveLayout();
  const { evaluationResult, processedDocIds, setEvaluationResult } = useProfileStore();
  
  const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<{exp: any, index: number} | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [proofImageBase64, setProofImageBase64] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const openVerifyModal = (exp: any, index: number) => {
    setSelectedSprint({ exp, index });
    setProofText('');
    setProofImageUri(null);
    setProofImageBase64(null);
    setVerificationFeedback(null);
    setIsVerifyModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofImageUri(asset.uri);
        
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        setProofImageBase64(base64);
      }
    } catch (err) {
      console.log('Error picking image', err);
      Alert.alert('Error', 'Could not select image.');
    }
  };

  const handleVerifySprint = async () => {
    if ((!proofText.trim() && !proofImageBase64) || !selectedSprint) return;
    
    setIsVerifying(true);
    setVerificationFeedback(null);
    try {
      const response = await apiClient.post('/evaluate/verify-sprint', {
        sprintTitle: selectedSprint.exp.title,
        sprintDesc: selectedSprint.exp.description,
        proofText: proofText,
        proofImageBase64: proofImageBase64
      });

      if (response.data?.success && response.data?.verified) {
        Alert.alert("Verified!", "Great job! Your fundability score has increased.");
        
        const newEval = JSON.parse(JSON.stringify(evaluationResult));
        if (newEval.gtm_strategy && newEval.gtm_strategy.experiments) {
          newEval.gtm_strategy.experiments[selectedSprint.index].status = 'Completed';
          if (selectedSprint.index + 1 < newEval.gtm_strategy.experiments.length) {
            newEval.gtm_strategy.experiments[selectedSprint.index + 1].status = 'Active';
          }
        }
        
        newEval.overall_score = Math.min(100, (newEval.overall_score || 0) + 2);
        newEval.execution_score = Math.min(100, (newEval.execution_score || 0) + 5);
        
        setEvaluationResult(newEval);
        setIsVerifyModalVisible(false);
      } else {
        setVerificationFeedback(response.data?.feedback || "Proof was not sufficient.");
      }
    } catch (error) {
      console.error('Verify error:', error);
      Alert.alert('Error', 'Failed to reach AI verifier. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const hasRequiredDocs = processedDocIds.includes('pitch_deck');

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
  };

  const gtm: Partial<GTMStrategy> = evaluationResult?.gtm_strategy || {};
  const channels = gtm.channels || [];
  const experiments = gtm.experiments || [];

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <EcosystemEmptyState 
          featureName="GTM Strategy" 
          requiredDocument="Pitch Deck" 
          iconName="rocket-outline" 
        />
      </View>
    );
  }

  return (
    <View style={styles.lightEnvironment}>
      <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Top Nav */}
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>GTM Command Center</Text>
          <View style={{ width: 44 }} />
        </View>

        <AIDisclaimer />

        {/* 2x2 Unit Economics Grid */}
        <View style={styles.gridSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UNIT ECONOMICS</Text>
            <TouchableOpacity style={styles.updateBtn} onPress={() => Alert.alert('Sync Data', 'To fetch fresh AI data, please re-run the AI Analysis in your Data Room.')}>
              <Ionicons name="sync-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.updateBtnText}>SYNC DATA</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.econGrid}>
            <View style={[styles.econCard, { width: isTablet ? '48%' : '48%' }]}>
              <View style={styles.econHeaderRow}>
                <Text style={styles.econLabel}>BLENDED CAC</Text>
              </View>
              <Text style={styles.econValue}>{formatCurrency(gtm.blended_cac)}</Text>
              <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '40%', backgroundColor: theme.colors.primary }]} /></View>
            </View>

            <View style={[styles.econCard, { width: isTablet ? '48%' : '48%', borderColor: '#10B981', borderWidth: 1.5 }]}>
              <View style={styles.econHeaderRow}>
                <Text style={styles.econLabel}>LTV</Text>
              </View>
              <Text style={[styles.econValue, { color: '#10B981' }]}>{formatCurrency(gtm.ltv)}</Text>
              <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '85%', backgroundColor: '#10B981' }]} /></View>
            </View>

            <View style={[styles.econCard, { width: isTablet ? '48%' : '48%' }]}>
              <View style={styles.econHeaderRow}>
                <Text style={styles.econLabel}>PAYBACK PERIOD</Text>
                <Ionicons name="time-outline" size={14} color="#94A3B8" />
              </View>
              <Text style={styles.econValue}>{gtm.payback_period != null ? `${gtm.payback_period} Mo` : 'N/A'}</Text>
              <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '30%', backgroundColor: '#F59E0B' }]} /></View>
            </View>

            <View style={[styles.econCard, { width: isTablet ? '48%' : '48%' }]}>
              <View style={styles.econHeaderRow}>
                <Text style={styles.econLabel}>LTV:CAC RATIO</Text>
                <Ionicons name="analytics-outline" size={14} color="#94A3B8" />
              </View>
              <Text style={styles.econValue}>{gtm.ltv_cac_ratio != null ? `${gtm.ltv_cac_ratio}x` : 'N/A'}</Text>
              <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${Math.min(100, (gtm.ltv_cac_ratio || 0) * 20)}%`, backgroundColor: theme.colors.primary }]} /></View>
            </View>
          </View>
        </View>

        {/* Growth Channels */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>GROWTH CHANNELS</Text>
          <View style={styles.channelList}>
            {channels.map((channel: any, index: number) => {
              const isHigh = channel.status === 'Scaling';
              const isLow = channel.status === 'Saturated';
              const color = isHigh ? '#10B981' : isLow ? '#EF4444' : '#F59E0B';
              const bgColor = isHigh ? '#F0FDF4' : isLow ? '#FEF2F2' : '#FFFBEB';
              
              return (
                <View key={index} style={[styles.channelRow, index === channels.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                  <View style={styles.channelLeft}>
                    <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                      <Ionicons name="analytics" size={20} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.channelName} numberOfLines={2}>{channel.name}</Text>
                      <Text style={styles.channelSub}>{formatCurrency(channel.cac)} CAC</Text>
                    </View>
                  </View>
                  <View style={[styles.roiBadge, { backgroundColor: color }]}>
                    <Text style={styles.roiBadgeText}>{channel.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}
            {(!channels || channels.length === 0) && (
              <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>No channel data extracted</Text>
            )}
          </View>
        </View>

        {/* Experiment Roadmap */}
        <View style={styles.roadmapSection}>
          <Text style={styles.sectionTitle}>EXPERIMENT ROADMAP</Text>
          <View style={styles.timelineContainer}>
            {experiments.map((exp: any, index: number) => {
              const isActive = exp.status === 'Active';
              const isCompleted = exp.status === 'Completed';
              return (
                <React.Fragment key={index}>
                  <View style={styles.timelineNode}>
                    <View style={[styles.timelineCircle, { borderColor: isCompleted ? '#A7F3D0' : isActive ? '#DBEAFE' : '#E2E8F0', backgroundColor: isCompleted ? '#D1FAE5' : isActive ? '#EFF6FF' : '#F8FAFC' }]}>
                      {isActive && <Ionicons name="flash" size={10} color={theme.colors.primary} />}
                      {isCompleted && <Ionicons name="checkmark-sharp" size={12} color="#10B981" />}
                    </View>
                    <TouchableOpacity 
                      activeOpacity={isActive ? 0.7 : 1}
                      onPress={() => isActive ? openVerifyModal(exp, index) : null}
                      style={[styles.timelineContent, isActive ? styles.activeSprintCard : { padding: 4 }]}
                    >
                      {isActive ? (
                        <View style={styles.sprintHeader}>
                          <Text style={styles.sprintLabel}>SPRINT {index + 1}</Text>
                          <View style={styles.inProgressBadge}>
                            <View style={styles.pulsingDot} />
                            <Text style={styles.inProgressText}>ACTIVE - TAP TO VERIFY</Text>
                          </View>
                        </View>
                      ) : isCompleted ? (
                        <View style={styles.sprintHeader}>
                          <Text style={[styles.sprintLabel, { color: '#10B981' }]}>SPRINT {index + 1}</Text>
                          <View style={[styles.inProgressBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Text style={[styles.inProgressText, { color: '#10B981' }]}>COMPLETED</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.sprintLabel, { color: '#94A3B8' }]}>SPRINT {index + 1} (UPCOMING)</Text>
                      )}
                      <Text style={[styles.sprintTitle, isCompleted && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>{exp.title}</Text>
                      <Text style={styles.sprintDesc}>{exp.description}</Text>
                    </TouchableOpacity>
                  </View>
                  {index < experiments.length - 1 && <View style={styles.timelineLine} />}
                </React.Fragment>
              );
            })}
            {(!experiments || experiments.length === 0) && (
              <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>No experiments extracted</Text>
            )}
          </View>
        </View>

      </ResponsiveScrollContainer>

      <Modal visible={isVerifyModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsVerifyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Completion</Text>
            <TouchableOpacity onPress={() => setIsVerifyModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{selectedSprint?.exp.title}</Text>
            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>{selectedSprint?.exp.description}</Text>
            
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 }}>Proof of Execution</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Describe exactly what you did, the metrics you achieved, or paste a link to your results. Devang AI will verify this proof.</Text>
            
            <TextInput
              style={styles.proofInput}
              value={proofText}
              onChangeText={setProofText}
              placeholder="e.g. I ran LinkedIn ads with $500 budget and got 50 signups at $10 CAC..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
            />
            
            {proofImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: proofImageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setProofImageUri(null); setProofImageBase64(null); }}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={20} color="#3B82F6" />
                <Text style={styles.attachBtnText}>Attach Screenshot Proof</Text>
              </TouchableOpacity>
            )}
            
            {verificationFeedback && (
              <View style={styles.feedbackBox}>
                <Ionicons name="warning-outline" size={20} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.feedbackText}>{verificationFeedback}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.verifyBtn, ((!proofText.trim() && !proofImageBase64) || isVerifying) && styles.verifyBtnDisabled]} 
              onPress={handleVerifySprint}
              disabled={(!proofText.trim() && !proofImageBase64) || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.verifyBtnText}>Verify with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  lightEnvironment: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    backgroundColor: 'transparent',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.premiumLight,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  updateBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  gridSection: {
    marginBottom: 40,
  },
  econGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  econCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.premiumLight,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  econHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  econLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  econValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 4,
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  listSection: {
    marginBottom: 40,
  },
  channelList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.premiumLight,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  channelSub: {
    fontSize: 12,
    color: '#64748B',
  },
  roiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roadmapSection: {
    marginBottom: 40,
  },
  timelineContainer: {
    paddingLeft: 8,
    marginTop: 8,
  },
  timelineNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginLeft: 9,
    marginVertical: 4,
  },
  timelineContent: {
    marginLeft: 16,
    flex: 1,
  },
  activeSprintCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.premiumLight,
    marginTop: -8,
  },
  sprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sprintLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  inProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 4,
  },
  inProgressText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  sprintTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  sprintDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 20,
  },
  proofInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    height: 150,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 24,
    ...theme.shadows.premiumLight,
  },
  verifyBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  feedbackText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginBottom: 24,
    justifyContent: 'center',
  },
  attachBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
});
