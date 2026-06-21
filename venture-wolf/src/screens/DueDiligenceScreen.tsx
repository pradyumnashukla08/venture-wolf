import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfile } from '../context/ProfileContext';
import { getAIPromptForStage } from '../services/aiPromptMatrix';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

export const DueDiligenceScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth } = useResponsiveLayout();
  const { startupStage, evaluationResult, processedDocIds } = useProfile();
  
  const hasFinancials = processedDocIds.some(id => 
    ['fin_model', 'basic_pnl', 'three_stmt', 'hist_fin', 'bank_stmts', 'bva_sheet', 'audited_fin', 'trial_bal', 'spend_plan', 'basic_cap', 'std_cap'].includes(id)
  );
  const hasRequiredDocs = processedDocIds.includes('pitch_deck') && hasFinancials;
  
  const aiPrompt = getAIPromptForStage(startupStage);
  const redFlags = Array.isArray(evaluationResult?.red_flags) && evaluationResult.red_flags.length > 0 
    ? evaluationResult.red_flags 
    : ['AI is still processing your data...'];

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: theme.colors.darkBackground }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
          </TouchableOpacity>
        </View>
        <EcosystemEmptyState 
          featureName="AI Due Diligence" 
          requiredDocument="Pitch Deck & Financials" 
          iconName="shield-checkmark-outline" 
        />
      </View>
    );
  }

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav */}
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>AI Due Diligence</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* DYNAMIC AI PARAMETERS CARD */}
      <View style={styles.aiParametersCard}>
        <View style={styles.aiParamHeader}>
          <Ionicons name="hardware-chip-outline" size={16} color="#38BDF8" />
          <Text style={styles.aiParamTitle}>ACTIVE AI EVALUATOR ({startupStage.toUpperCase()})</Text>
        </View>
        <Text style={styles.aiPersonaText}>Persona: {aiPrompt.persona}</Text>
        <Text style={styles.aiRulesText}>Focus Rules: {aiPrompt.rules}</Text>
        <Text style={styles.aiRedFlagsText}>AI Penalty Criteria: {aiPrompt.redFlags}</Text>
      </View>

      {/* AI Context Explainer */}
      <View style={styles.explainerBox}>
        <Ionicons name="shield-checkmark" size={20} color={theme.colors.secondary} style={{ marginRight: 12, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.explainerTitle}>AI Diligence Engine Output</Text>
          <Text style={styles.explainerText}>
            Our ML model has ingested the founder's entire data room, routing through the specific Stage Matrix shown above to automatically flag risks, validate strengths, and generate high-leverage interview questions.
          </Text>
        </View>
      </View>

      {/* Grid for Strengths and Risks on Tablet, column on Mobile */}
      <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
        
        {/* STRENGTHS */}
        <View style={[styles.section, { width: halfWidth }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="checkmark-sharp" size={16} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>VALIDATED STRENGTHS</Text>
          </View>

          <View style={styles.listContainer}>
            <View style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Evaluated Market & Team</Text>
                <Text style={styles.itemDesc}>Score: {evaluationResult?.market_score || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Execution Capabilities</Text>
                <Text style={styles.itemDesc}>Score: {evaluationResult?.execution_score || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* RISKS */}
        <View style={[styles.section, { width: halfWidth }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
            </View>
            <Text style={styles.sectionTitle}>IDENTIFIED RISKS</Text>
          </View>

          <View style={styles.listContainer}>
            {redFlags.map((flag: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Flag #{index + 1}</Text>
                  <Text style={styles.itemDesc}>{flag}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* QUESTIONS TO ASK */}
      <View style={[styles.section, { marginTop: 16 }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' }]}>
            <Ionicons name="help-circle-outline" size={16} color="#38BDF8" />
          </View>
          <Text style={styles.sectionTitle}>AI-GENERATED INTERVIEW QUESTIONS</Text>
        </View>
        
        <View style={styles.listContainer}>
          {evaluationResult?.questions && evaluationResult.questions.length > 0 ? (
            evaluationResult.questions.map((item: any, index: number) => (
              <View key={index} style={styles.questionItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.secondary} style={{ marginRight: 16, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.questionText}>"{item.question}"</Text>
                  <Text style={styles.itemDesc}>{item.reason}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.questionItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.secondary} style={{ marginRight: 16, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.questionText}>"What is your primary moat?"</Text>
                <Text style={styles.itemDesc}>Basic question while AI processes data...</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.premiumActionButton} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ActionPlan')}
        >
          <View style={styles.premiumActionInner}>
            <Ionicons name="flash" size={24} color="#0B0F19" style={{ marginRight: 8 }} />
            <Text style={styles.premiumActionText}>GENERATE ACTION PLAN</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkBackground,
  },
  content: {
    padding: 24,
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
    backgroundColor: theme.colors.darkSurface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.borders.premiumDark,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: 0.5,
  },
  aiParametersCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiParamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiParamTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
    marginLeft: 8,
  },
  aiPersonaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  aiRulesText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 20,
  },
  aiRedFlagsText: {
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 20,
    fontWeight: '500',
  },
  explainerBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    marginBottom: 40,
  },
  explainerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  explainerText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    backgroundColor: theme.colors.darkSurface,
    padding: 20,
    borderRadius: 16,
    ...theme.borders.premiumDark,
  },
  questionItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkSurface,
    padding: 20,
    borderRadius: 16,
    ...theme.borders.premiumDark,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 12,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  itemDesc: {
    fontSize: 14,
    color: theme.colors.darkTextMuted,
    lineHeight: 22,
  },
  actionContainer: {
    paddingTop: 8,
    alignItems: 'center',
  },
  premiumActionButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#10B981', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 15, 
    elevation: 8,
    marginBottom: 16,
  },
  premiumActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumActionText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
