import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Easing, Alert, Linking } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { BASE_URL } from '../config/api';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const LOADING_STATES = [
  "Sanitizing Data...",
  "Running Market Vectors...",
  "Evaluating LTV:CAC Ratio...",
  "Consulting AI Committee...",
  "Finalizing Verdict..."
];

const DOC_CHECKLIST: Record<string, { id: string, label: string, format: string, subLabel: string, icon: any, description: string }[]> = {
  'Pre-Seed': [
    { id: 'pitch_deck', label: 'Pitch Deck', format: 'pdf,image', subLabel: 'PDF or Image • Max 15MB', icon: 'document-text', description: 'A 10-15 slide presentation covering the Problem, Solution, Market Size, Business Model, Team, and "The Ask".' },
    { id: 'inc_docs', label: 'Incorporation Documents', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'business', description: 'Legal proof of company registration (e.g., Certificate of Incorporation, GSTIN/CIN).' },
    { id: 'basic_cap', label: 'Basic Cap Table', format: 'excel', subLabel: 'Excel/CSV', icon: 'pie-chart', description: 'A simple spreadsheet listing founders, early team members, and any initial angel investors with their equity percentages.' },
    { id: 'spend_plan', label: 'Hiring & Spend Plan', format: 'excel', subLabel: 'Excel/CSV', icon: 'cash', description: 'A 12-month projection showing how you will spend the raised capital (salaries, marketing, product).' }
  ],
  'Seed': [
    { id: 'pitch_deck', label: 'Pitch Deck', format: 'pdf,image', subLabel: 'PDF or Image • Max 15MB', icon: 'document-text', description: 'A 15-20 slide deck focused on early traction, unit economics, and the go-to-market strategy.' },
    { id: 'bank_stmts', label: 'Bank Statements (3 Mos)', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'card', description: 'Official bank statements showing current cash balance and recent burn rate.' },
    { id: 'fin_model', label: 'Financial Model', format: 'excel', subLabel: 'Excel/CSV', icon: 'bar-chart', description: 'A 3-year projection of revenue, costs, and cash flow with clear assumptions.' },
    { id: 'std_cap', label: 'Standard Cap Table', format: 'excel', subLabel: 'Excel/CSV', icon: 'pie-chart', description: 'Cap table including ESOP pools, convertible notes, SAFEs, and priced rounds.' },
    { id: 'basic_pnl', label: 'Basic P&L', format: 'excel', subLabel: 'Excel/CSV', icon: 'calculator', description: 'Profit and Loss statement showing historical revenue and expenses.' }
  ],
  'Series-A': [
    { id: 'tax_returns', label: 'Tax Returns (1-2 Yrs)', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'document', description: 'Official corporate tax filings for the past 1-2 years.' },
    { id: 'hist_fin', label: 'Historical Financials', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'library', description: 'Audited or management-prepared financial statements.' },
    { id: 'three_stmt', label: '3-Statement Model', format: 'excel', subLabel: 'Excel/CSV', icon: 'stats-chart', description: 'Integrated Income Statement, Balance Sheet, and Cash Flow projections.' },
    { id: 'trial_bal', label: 'Trial Balance / GL', format: 'excel', subLabel: 'Excel/CSV', icon: 'list', description: 'Detailed ledger of all financial transactions.' },
    { id: 'cust_cohort', label: 'Customer Cohort Sheet', format: 'excel', subLabel: 'Excel/CSV', icon: 'people', description: 'Monthly/Quarterly cohort retention analysis of users or revenue.' },
    { id: 'cac_ltv', label: 'CAC & LTV Calculator', format: 'excel', subLabel: 'Excel/CSV', icon: 'calculator', description: 'Detailed breakdown of customer acquisition cost vs lifetime value by channel.' }
  ],
  'Series-B': [
    { id: 'audited_fin', label: 'Audited Financials', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'shield-checkmark', description: 'Financial statements formally audited by a certified CPA firm.' },
    { id: 'mat_contracts', label: 'Material Contracts', format: 'pdf,image', subLabel: 'PDF or Image', icon: 'document-attach', description: 'Key enterprise client contracts, vendor agreements, and leases.' },
    { id: 'bva_sheet', label: 'Budget vs. Actuals (BvA)', format: 'excel', subLabel: 'Excel/CSV', icon: 'trending-up', description: 'Comparison of past financial projections against actual performance.' },
    { id: 'adv_cap', label: 'Advanced Cap Table Export', format: 'excel', subLabel: 'Excel/CSV', icon: 'pie-chart', description: 'Fully modeled cap table including pro-forma scenarios and liquidation preferences.' },
    { id: 'gran_nrr', label: 'Granular NRR', format: 'excel', subLabel: 'Excel/CSV', icon: 'analytics', description: 'Net Revenue Retention breakdown including expansion, contraction, and churn.' }
  ]
};

export const DataRoomScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth } = useResponsiveLayout();
  const { completeImport, apiFetch } = useAuth();
  const { startupStage, setEvaluationResult, setProcessedDocIds, uploadedDocs, setUploadedDocs } = useProfile();

  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isPicking, setIsPicking] = useState(false);

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const performEvaluation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          Alert.alert('Authentication Required', 'Please sign in to run the AI analysis.');
          setIsProcessing(false);
          return;
        }

        const response = await apiFetch(`${BASE_URL}/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            startupId: session.user.id,
            stage: startupStage,
            documents: uploadedDocs
          })
        });

        let result;
        try {
          const responseText = await response.text();
          result = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          result = { error: `Invalid server response format (Status: ${response.status})` };
        }

        if (!response.ok) {
          const errorMessage = result?.details || result?.error || `Server returned ${response.status}: Unable to process your request.`;
          throw new Error(errorMessage);
        }
        
        if (result.success && isMounted) {
          setEvaluationResult(result.evaluation);
          setProcessedDocIds(uploadedDocs.map(d => d.id));
          completeImport();
          navigation.replace('DueDiligence');
        }
      } catch (error: any) {
        console.error('AI Evaluation Error:', error);
        if (isMounted) {
          Alert.alert('Analysis Failed', error.message || 'The AI engine encountered an unexpected error.');
          setIsProcessing(false);
        }
      }
    };

    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
      ).start();

      let currentIndex = 0;
      interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % LOADING_STATES.length;
        if (isMounted) setLoadingTextIndex(currentIndex);
      }, 1000);

      performEvaluation();
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, navigation, completeImport, startupStage, uploadedDocs, setEvaluationResult]);

  const handleUpload = async (docId: string, expectedFormat: string, label: string) => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const allowedTypes: string[] = [];
      if (expectedFormat.includes('pdf')) allowedTypes.push('application/pdf');
      if (expectedFormat.includes('image')) {
        allowedTypes.push('image/jpeg');
        allowedTypes.push('image/png');
      }
      if (expectedFormat.includes('excel')) {
        allowedTypes.push('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        allowedTypes.push('text/csv');
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes.length > 0 ? allowedTypes : '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Error', 'You must be logged in to upload files.');
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        const filePath = `${session.user.id}/${Date.now()}_${asset.name.replace(/\s/g, '_')}`;

        const { data, error } = await supabase.storage
          .from('data_room')
          .upload(filePath, decode(base64), {
            contentType: asset.mimeType || 'application/octet-stream',
            upsert: true
          });

        if (error) {
          Alert.alert('Upload Failed', error.message);
          return;
        }

        setUploadedDocs(prev => {
          const filtered = prev.filter(d => d.id !== docId);
          return [...filtered, { id: docId, type: label, path: data.path, format: asset.mimeType || '' }];
        });
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('System Error', error.message);
    } finally {
      setIsPicking(false);
    }
  };

  const handlePreview = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('data_room').createSignedUrl(path, 60);
      if (error) {
        Alert.alert('Error', 'Could not generate preview link.');
        return;
      }
      if (data?.signedUrl) {
        Linking.openURL(data.signedUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ResponsiveScrollContainer contentContainerStyle={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.pageTitle}>Data Room Import</Text>
          <Text style={styles.pageSubtitle}>Upload your core materials. The AI Diligence Engine will extract and cross-verify all entities.</Text>
        </View>

        <View style={styles.dropzonesContainer}>
          {(DOC_CHECKLIST[startupStage] || DOC_CHECKLIST['Seed']).map((doc) => {
            const uploadedDoc = uploadedDocs.find(d => d.id === doc.id);
            const isUploaded = !!uploadedDoc;
            return (
              <View key={doc.id} style={{ position: 'relative' }}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={[styles.dropzone, isUploaded && styles.dropzoneSuccess]} 
                  onPress={() => handleUpload(doc.id, doc.format, doc.label)}
                >
                  <View style={[styles.iconCircle, isUploaded && styles.iconCircleSuccess]}>
                    <Ionicons name={isUploaded ? "checkmark" : doc.icon} size={32} color={isUploaded ? "#10B981" : "#0F172A"} />
                  </View>
                  <Text style={styles.dropzoneTitle}>{isUploaded ? `${doc.label} Uploaded` : `Upload ${doc.label}`}</Text>
                  <Text style={styles.dropzoneSub}>{doc.subLabel}</Text>
                  
                  {!isUploaded && (
                    <View style={styles.descriptionBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{marginRight: 6, marginTop: 2}} />
                      <Text style={styles.descriptionText}>{doc.description}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {isUploaded && uploadedDoc?.path && (
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#F0FDF4', padding: 8, borderRadius: 20 }}
                    onPress={() => handlePreview(uploadedDoc.path)}
                  >
                    <Ionicons name="eye" size={20} color="#10B981" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {!isProcessing && (
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelineHeader}>
              <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
              <Text style={styles.guidelineTitle}>How AI Extraction Works</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Ionicons name="scan-outline" size={18} color="#64748B" />
              <Text style={styles.guidelineText}>Our engine scans your deck for 5 core vectors: Product, Market, Finance, Team, and Execution.</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" />
              <Text style={styles.guidelineText}>Financial metrics are cross-referenced with your uploaded Excel/CSV data to calculate LTV:CAC and runway.</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Ionicons name="bulb-outline" size={18} color="#64748B" />
              <Text style={styles.guidelineText}>Tip: Keep slides clean and use standard fonts. Avoid heavy text blocks for maximum AI extraction accuracy.</Text>
            </View>
          </View>
        )}

        {isProcessing && (
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.aiGlowOrb}>
                <Ionicons name="sparkles" size={40} color="#FFFFFF" />
              </View>
            </Animated.View>
            <Text style={styles.loadingText}>{LOADING_STATES[loadingTextIndex]}</Text>
          </View>
        )}

      </ResponsiveScrollContainer>

      <View style={[styles.bottomBar, theme.shadows.premiumLight]}>
        <TouchableOpacity 
          style={[styles.primaryButton, (isProcessing || uploadedDocs.length === 0) && styles.primaryButtonDisabled]} 
          activeOpacity={0.8}
          disabled={isProcessing || uploadedDocs.length === 0}
          onPress={() => setIsProcessing(true)}
        >
          <Text style={styles.primaryButtonText}>
            {isProcessing ? 'AI PROCESSING INITIATED...' : uploadedDocs.length === 0 ? 'UPLOAD AT LEAST ONE DOCUMENT' : 'RUN AI ANALYSIS'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 24, paddingBottom: 120 },
  headerBlock: { marginBottom: 32, alignItems: 'center', marginTop: 24 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 8, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, maxWidth: 400 },
  
  dropzonesContainer: { gap: 16, marginBottom: 40 },
  dropzone: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconCircleSuccess: {
    backgroundColor: '#D1FAE5',
  },
  dropzoneTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  dropzoneSub: { fontSize: 13, color: '#64748B' },
  descriptionBox: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-start',
    width: '100%',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
    textAlign: 'left',
  },

  guidelinesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginLeft: 8,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guidelineText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 12,
    lineHeight: 20,
    flex: 1,
  },

  loadingContainer: { alignItems: 'center', marginTop: 16 },
  aiGlowOrb: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 15,
  },
  loadingText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 0.5 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#94A3B8' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
