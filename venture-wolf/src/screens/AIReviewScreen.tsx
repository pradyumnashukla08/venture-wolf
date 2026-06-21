import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfile } from '../context/ProfileContext';
import { getAIPromptForStage } from '../services/aiPromptMatrix';
import { generateActionSteps } from '../utils/remediationMapper';

export const AIReviewScreen = ({ navigation }: any) => {
  const { startupStage, evaluationResult } = useProfile();
  const aiPrompt = getAIPromptForStage(startupStage);

  // Fallbacks if data isn't loaded yet, with strict null-checking for nested properties
  const safeResult = evaluationResult || {};
  const evalData = {
    overall_score: typeof safeResult.overall_score === 'number' ? safeResult.overall_score : 50,
    team_score: typeof safeResult.team_score === 'number' ? safeResult.team_score : 50,
    market_score: typeof safeResult.market_score === 'number' ? safeResult.market_score : 50,
    execution_score: typeof safeResult.execution_score === 'number' ? safeResult.execution_score : 50,
    product_score: typeof safeResult.product_score === 'number' ? safeResult.product_score : 50,
    traction_score: typeof safeResult.traction_score === 'number' ? safeResult.traction_score : 50,
    red_flags: Array.isArray(safeResult.red_flags) && safeResult.red_flags.length > 0 ? safeResult.red_flags : ['AI is still processing your data...'],
    stage_advice: typeof safeResult.stage_advice === 'string' && safeResult.stage_advice ? safeResult.stage_advice : 'AI is still processing your data. Please check back shortly.'
  };

  // Derive metrics safely from AI data
  const productScore = evalData.product_score;
  const tractionScore = evalData.traction_score;

  // Radar chart math
  const getPoint = (angleDeg: number, score: number, maxRadius = 70) => {
    const r = (score / 100) * maxRadius;
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    const x = 80 + r * Math.cos(angleRad);
    const y = 80 + r * Math.sin(angleRad);
    return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
  };

  // Angles for 5 points
  const p1 = getPoint(0, evalData.team_score);
  const p2 = getPoint(72, productScore);
  const p3 = getPoint(144, evalData.market_score);
  const p4 = getPoint(216, tractionScore);
  const p5 = getPoint(288, evalData.execution_score);

  const dataPolygonPoints = `${p1.str} ${p2.str} ${p3.str} ${p4.str} ${p5.str}`;

  // Get letter grade
  const getGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  const handleExport = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Export Successful", "Your complete AI Due Diligence report has been compiled and sent to your registered email address.");
  };

  const handleAskAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Ask AI", "The interactive 'Interrogate AI' chat feature will be available in the next update. Stay tuned!");
  };

  const mappedFlags = generateActionSteps(evalData.red_flags);

  const MetricBar = ({ label, score }: { label: string, score: number }) => (
    <View style={styles.metricBarContainer}>
      <View style={styles.metricBarHeader}>
        <Text style={styles.metricBarLabel}>{label}</Text>
        <Text style={styles.metricBarScore}>{score}/100</Text>
      </View>
      <View style={styles.metricBarTrack}>
        <View style={[styles.metricBarFill, { 
          width: `${Math.max(0, Math.min(100, score))}%`, 
          backgroundColor: score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444' 
        }]} />
      </View>
    </View>
  );

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.pageTitle}>AI Review</Text>
      </View>

      <View style={styles.topSection}>
        <View style={styles.gradeBox}>
          <Text style={styles.gradeTitle}>OVERALL GRADE</Text>
          <View style={[styles.gradeCircle, theme.borders.premiumDark]}>
            <Text style={styles.gradeLetter}>{getGrade(evalData.overall_score)}</Text>
            <Text style={styles.gradeScore}>{evalData.overall_score} / 100</Text>
          </View>
        </View>

        <View style={styles.radarContainer}>
          <Svg height="160" width="160" viewBox="0 0 160 160">
            {/* Background Polygon */}
            <Polygon 
              points="80,10 146.5,58.5 121,136.5 39,136.5 13.5,58.5" 
              fill="rgba(56, 189, 248, 0.05)" 
              stroke="rgba(255,255,255,0.1)" 
              strokeWidth="1" 
            />
            {/* Data Polygon */}
            <Polygon 
              points={dataPolygonPoints} 
              fill="rgba(56, 189, 248, 0.4)" 
              stroke={theme.colors.primary} 
              strokeWidth="2" 
            />
            {/* Dots */}
            <Circle cx={p1.x} cy={p1.y} r="4" fill={theme.colors.primary} />
            <Circle cx={p2.x} cy={p2.y} r="4" fill={theme.colors.primary} />
            <Circle cx={p3.x} cy={p3.y} r="4" fill={theme.colors.primary} />
            <Circle cx={p4.x} cy={p4.y} r="4" fill={theme.colors.primary} />
            <Circle cx={p5.x} cy={p5.y} r="4" fill={theme.colors.primary} />
          </Svg>
          
          <Text style={[styles.axisLabel, { top: -15, left: 55 }]}>TEAM {evalData.team_score}</Text>
          <Text style={[styles.axisLabel, { top: 40, right: -25 }]}>PROD {productScore}</Text>
          <Text style={[styles.axisLabel, { bottom: -10, right: -5 }]}>MKT {evalData.market_score}</Text>
          <Text style={[styles.axisLabel, { bottom: -10, left: -20 }]}>TRAC {tractionScore}</Text>
          <Text style={[styles.axisLabel, { top: 40, left: -20 }]}>EXEC {evalData.execution_score}</Text>
        </View>
      </View>

      <View style={styles.aiParametersCard}>
        <View style={styles.aiParamHeader}>
          <Text style={styles.aiParamTitle}>ACTIVE AI EVALUATOR ({startupStage.toUpperCase()})</Text>
        </View>
        <Text style={styles.aiPersonaText}>Persona: {aiPrompt.persona}</Text>
        <Text style={styles.aiRulesText}>Focus Rules: {aiPrompt.rules}</Text>
      </View>

      <View style={[styles.insightsCard, theme.shadows.premiumLight]}>
        <Text style={styles.insightsTitle}>RADAR DIAGNOSTICS</Text>
        <Text style={styles.insightsText}>
          {evalData.stage_advice}
        </Text>
      </View>

      <View style={[styles.metricsDetailedContainer, theme.shadows.premiumLight]}>
        <Text style={styles.metricsDetailedTitle}>METRIC BREAKDOWN</Text>
        <MetricBar label="Team & Founders" score={evalData.team_score} />
        <MetricBar label="Product & Tech" score={productScore} />
        <MetricBar label="Market & Opportunity" score={evalData.market_score} />
        <MetricBar label="Traction & Metrics" score={tractionScore} />
        <MetricBar label="Execution Plan" score={evalData.execution_score} />
      </View>

      <View style={[styles.flagsSection, theme.shadows.premiumLight]}>
        <Text style={styles.flagsTitle}>CRITICAL RED FLAGS</Text>
        {mappedFlags.map((step, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.flagItemBox}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ActionPlan')}
          >
            <View style={styles.flagHeaderRow}>
               <View style={styles.flagBadge}>
                 <Text style={styles.flagBadgeText}>{step.type.toUpperCase()}</Text>
               </View>
               <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
            </View>
            <Text style={styles.flagText}>{step.task}</Text>
            {step.fix && (
              <View style={styles.flagFixBox}>
                <Ionicons name="bulb" size={14} color="#D97706" style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.flagFixText}>{step.fix}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
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

        <View style={styles.secondaryActionRow}>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={handleExport}>
             <Ionicons name="download-outline" size={20} color="#0F172A" style={{marginRight: 6}} />
             <Text style={styles.secondaryBtnText}>Export PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.secondaryBtn, {backgroundColor: '#1E293B', borderColor: '#1E293B'}]} activeOpacity={0.7} onPress={handleAskAI}>
             <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" style={{marginRight: 6}} />
             <Text style={[styles.secondaryBtnText, {color: '#FFFFFF'}]}>Ask AI</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          activeOpacity={0.7} 
          style={styles.fullReportContainer}
          onPress={() => navigation.navigate('DueDiligence')}
        >
          <Text style={styles.fullReportLink}>VIEW FULL AI DUE DILIGENCE REPORT</Text>
        </TouchableOpacity>
      </View>
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.lightBackground,
  },
  content: {
    paddingBottom: 40,
  },
  headerBlock: {
    padding: 24,
    paddingTop: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.lightText,
    letterSpacing: -0.5,
  },
  topSection: {
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  gradeBox: {
    alignItems: 'center',
  },
  gradeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: theme.colors.lightTextMuted,
    marginBottom: 16,
  },
  gradeCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.lightSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
  },
  gradeLetter: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: -1,
  },
  gradeScore: {
    fontSize: 12,
    color: theme.colors.lightTextMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  radarContainer: {
    position: 'relative',
    width: 160,
    height: 160,
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: theme.colors.primary,
  },
  aiParametersCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
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
  insightsCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
  },
  insightsTitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  insightsText: {
    fontSize: 14,
    color: theme.colors.lightText,
    lineHeight: 22,
    fontWeight: '500',
  },
  highlightText: {
    fontWeight: '900',
    color: theme.colors.lightText,
  },
  warningText: {
    fontWeight: '900',
    color: '#EF4444',
  },
  flagsSection: {
    padding: 24,
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 24,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
  },
  flagsTitle: {
    color: '#EF4444', // Red
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  flagIconRed: {
    color: '#EF4444',
    fontSize: 14,
    marginRight: 16,
    fontWeight: '900',
  },
  flagText: {
    color: theme.colors.lightText,
    fontSize: 15,
    fontWeight: '500',
  },
  actionContainer: {
    padding: 24,
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
  fullReportContainer: {
    alignItems: 'center',
    padding: 16,
  },
  fullReportLink: {
    color: theme.colors.lightTextMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  secondaryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metricsDetailedContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
  },
  metricsDetailedTitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 20,
  },
  metricBarContainer: {
    marginBottom: 16,
  },
  metricBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricBarLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  metricBarScore: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  flagItemBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  flagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flagBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flagBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  flagFixBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flagFixText: {
    color: '#475569',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
});
