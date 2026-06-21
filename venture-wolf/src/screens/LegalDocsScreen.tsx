// Forces IDE cache refresh
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useWindowDimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfile } from '../context/ProfileContext';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

const AccordionItem = ({ title, standard, flags, actionLabel }: any) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity activeOpacity={0.7} style={styles.accordionHeader} onPress={toggleExpand}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.accordionBody}>
          <View style={styles.standardBox}>
            <Text style={styles.boxLabelGreen}>THE STANDARD</Text>
            <Text style={styles.standardText}>{standard}</Text>
          </View>
          <View style={styles.flagsBox}>
            <Text style={styles.boxLabelRed}>RED FLAGS</Text>
            <Text style={styles.flagsText}>{flags}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const LegalDocsScreen = ({ navigation }: any) => {
  const { evaluationResult, processedDocIds } = useProfile();
  
  const hasRequiredDocs = processedDocIds.includes('inc_docs');

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <EcosystemEmptyState 
          featureName="Legal Standards" 
          requiredDocument="Incorporation Documents" 
          iconName="document-lock-outline" 
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
          <Text style={styles.pageTitle}>Legal Standards</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Institutional Legal Standards</Text>
          <Text style={styles.headerDesc}>Standardized deal structures and VC-approved templates to protect your equity during due diligence.</Text>
        </View>

        {/* Accordions */}
        <View style={styles.accordionContainer}>
          <AccordionItem 
            title="Founders' Agreement"
            standard="4-Year Vesting Schedule with a 1-Year Cliff. Strict IP Assignment. Clear deadlock resolution matrix."
            flags="Immediate 100% equity vesting. 50/50 voting splits without a tie-breaker mechanism."
            actionLabel="Generate Standard FA Template"
          />

          <AccordionItem 
            title="Advisor Agreement (FAST)"
            standard="Standard FAST terms. 0.1% to 1.0% equity based on stage. 2-year vesting, no cliff."
            flags="Paying cash to early-stage advisors. Open-ended scope. Restrictive non-competes."
            actionLabel="View FAST Structure"
          />

          <AccordionItem 
            title="IP Assignment Agreement"
            standard="Blanket transfer of all prior and future IP, code, and branding from founders directly to the corporate entity."
            flags="Carve-outs allowing founders to retain personal ownership of core algorithms."
            actionLabel="Generate IP Transfer Template"
          />
        </View>

      </ResponsiveScrollContainer>
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
    marginBottom: 32,
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
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  accordionContainer: {
    gap: 16,
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...theme.shadows.premiumLight,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  accordionBody: {
    padding: 20,
    paddingTop: 0,
  },
  standardBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  boxLabelGreen: {
    fontSize: 10,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  standardText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  flagsBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  boxLabelRed: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  flagsText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});
