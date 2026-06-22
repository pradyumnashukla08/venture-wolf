import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { theme } from '../constants/theme';
import { FinancialForecastTable } from '../components/FinancialForecastTable';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { AIDisclaimer } from '../components/AIDisclaimer';

import { useProfile } from '../context/ProfileContext';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

export const FinancialCommandCenter = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet } = useResponsiveLayout();
  const { evaluationResult, processedDocIds } = useProfile();
  
  const hasFinancials = processedDocIds.some(id => 
    ['fin_model', 'basic_pnl', 'three_stmt', 'hist_fin', 'bank_stmts', 'bva_sheet', 'audited_fin', 'trial_bal', 'spend_plan', 'basic_cap', 'std_cap'].includes(id)
  );

  const [hires, setHires] = useState(5);
  const [growth, setGrowth] = useState(25);
  const [fundraise, setFundraise] = useState(4); // in Crores

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${value}`;
  };

  const metrics = evaluationResult?.financial_metrics || {};

  // Calculate dynamic projected impact
  const fundraiseValue = fundraise * 10000000; // Cr to raw
  const newBurn = (metrics.monthly_burn || 0) + (hires * (metrics.headcount_cost || 0));
  const newRunway = newBurn > 0 ? Math.round(((metrics.cash_balance || 0) + fundraiseValue) / newBurn) : metrics.default_runway || 0;
  const runwayDiff = newRunway - (metrics.default_runway || 0);
  
  const targetArr = (metrics.arr || 0) * Math.pow(1 + (growth / 100), 12);
  const arrGrowthPercent = metrics.arr > 0 ? Math.round(((targetArr - metrics.arr) / metrics.arr) * 100) : 0;

  if (!evaluationResult || !hasFinancials) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <EcosystemEmptyState 
          featureName="Financial Command" 
          requiredDocument="Financial Model (Excel/CSV)" 
          iconName="calculator-outline" 
        />
      </View>
    );
  }

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.scrollPadding}>
      
      {/* Top Nav */}
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Financial Command</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* AI Context Explainer */}
      <View style={styles.explainerBox}>
        <Ionicons name="calculator" size={24} color={theme.colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.explainerTitle}>Deterministic Scenario Engine</Text>
          <Text style={styles.explainerText}>
            This command center links directly to your dynamic financial model. Adjusting headcount or revenue targets below will instantly recalculate your default runway and projected ARR based on 10,000+ localized SaaS burn trajectories.
          </Text>
        </View>
      </View>

      <AIDisclaimer />

      {/* SECTION 1: Unified Metrics Dashboard */}
      <View style={[styles.dashboardCard, theme.shadows.premiumLight]}>
        <View style={styles.dashboardGrid}>
          {/* Row 1 */}
          <View style={[styles.dashboardCell, styles.cellBorderBottom, styles.cellBorderRight, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#EFF6FF' }]}><Ionicons name="wallet" size={14} color="#3B82F6" /></View>
              <Text style={styles.dashboardLabel}>CASH BALANCE</Text>
            </View>
            <Text style={styles.dashboardValue}>{formatCurrency(metrics.cash_balance)}</Text>
          </View>
          
          <View style={[styles.dashboardCell, styles.cellBorderBottom, isTablet ? styles.cellBorderRight : {}, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#FEF2F2' }]}><Ionicons name="flame" size={14} color="#EF4444" /></View>
              <Text style={styles.dashboardLabel}>MONTHLY BURN</Text>
            </View>
            <Text style={styles.dashboardValue}>{formatCurrency(metrics.monthly_burn)}</Text>
          </View>
          
          <View style={[styles.dashboardCell, styles.cellBorderBottom, !isTablet ? styles.cellBorderRight : {}, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#F5F3FF' }]}><Ionicons name="hourglass" size={14} color="#8B5CF6" /></View>
              <Text style={styles.dashboardLabel}>DEFAULT RUNWAY</Text>
            </View>
            <Text style={styles.dashboardValue}>{metrics.default_runway != null ? `${metrics.default_runway} Mo` : 'N/A'}</Text>
          </View>
          
          {/* Row 2 */}
          <View style={[styles.dashboardCell, isTablet ? {} : styles.cellBorderBottom, isTablet ? styles.cellBorderRight : {}, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#F0FDF4' }]}><Ionicons name="trending-up" size={14} color="#10B981" /></View>
              <Text style={styles.dashboardLabel}>ARR</Text>
            </View>
            <Text style={styles.dashboardValue}>{formatCurrency(metrics.arr)}</Text>
          </View>

          <View style={[styles.dashboardCell, styles.cellBorderRight, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#F0FDF4' }]}><Ionicons name="trending-up" size={14} color="#10B981" /></View>
              <Text style={styles.dashboardLabel}>MRR</Text>
            </View>
            <Text style={styles.dashboardValue}>{formatCurrency(metrics.mrr)}</Text>
          </View>

          <View style={[styles.dashboardCell, { width: isTablet ? '33.3%' : '50%' }]}>
            <View style={styles.cellHeader}>
              <View style={[styles.smallIconBox, { backgroundColor: '#FEF2F2' }]}><Ionicons name="people" size={14} color="#EF4444" /></View>
              <Text style={styles.dashboardLabel}>HEADCOUNT COST</Text>
            </View>
            <Text style={styles.dashboardValue}>{metrics.headcount_cost != null ? `${formatCurrency(metrics.headcount_cost)}/mo` : 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* SECTION 1.5: Financial Forecast Engine */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Forecast Engine</Text>
        <FinancialForecastTable />
      </View>

      {/* SECTION 2: Scenario Planning Simulator */}
      <View style={[styles.scenarioCard, theme.shadows.premiumLight]}>
        <Text style={styles.sectionTitle}>Scenario Planning</Text>
        
        {/* Visual Slider 1 */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>NEW HIRES (12 MO)</Text>
            <Text style={styles.sliderValue}>{hires} EMPLOYEES</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={20}
            step={1}
            value={hires}
            onValueChange={setHires}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="#F1F5F9"
            thumbTintColor="#FFFFFF"
          />
          <View style={styles.sliderLimits}>
            <Text style={styles.limitText}>0</Text>
            <Text style={styles.limitText}>20</Text>
          </View>
        </View>

        {/* Visual Slider 2 */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>TARGET GROWTH RATE</Text>
            <Text style={styles.sliderValue}>{growth}% MoM</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={10}
            maximumValue={50}
            step={1}
            value={growth}
            onValueChange={setGrowth}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="#F1F5F9"
            thumbTintColor="#FFFFFF"
          />
          <View style={styles.sliderLimits}>
            <Text style={styles.limitText}>10%</Text>
            <Text style={styles.limitText}>50%</Text>
          </View>
        </View>

        {/* Visual Slider 3 */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>UPCOMING FUNDRAISE</Text>
            <Text style={styles.sliderValue}>₹{fundraise} Cr</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={10}
            step={0.5}
            value={fundraise}
            onValueChange={setFundraise}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="#F1F5F9"
            thumbTintColor="#FFFFFF"
          />
          <View style={styles.sliderLimits}>
            <Text style={styles.limitText}>₹0</Text>
            <Text style={styles.limitText}>₹10 Cr</Text>
          </View>
        </View>
      </View>

      {/* SECTION 3: Projected Outcome Card */}
      <View style={styles.outcomeCard}>
        <View style={styles.outcomeHeaderRow}>
          <Ionicons name="flash" size={24} color={theme.colors.secondary} />
          <Text style={styles.outcomeTitle}>Projected Impact</Text>
        </View>
        
        <View style={styles.outcomeContentRow}>
          <View style={styles.outcomeBlock}>
            <Text style={styles.outcomeLabel}>ADJUSTED RUNWAY</Text>
            <Text style={styles.outcomeHighlight}>{newRunway} Mo</Text>
            <Text style={[styles.outcomeSub, { color: runwayDiff >= 0 ? '#10B981' : '#EF4444' }]}>
              {runwayDiff > 0 ? '+' : ''}{runwayDiff} Mo impact
            </Text>
          </View>
          
          <View style={styles.outcomeDivider} />
          
          <View style={styles.outcomeBlock}>
            <Text style={styles.outcomeLabel}>TARGET ARR (YR 1)</Text>
            <Text style={styles.outcomeHighlight}>{formatCurrency(targetArr)}</Text>
            <Text style={[styles.outcomeSub, { color: '#10B981' }]}>+{arrGrowthPercent}% growth</Text>
          </View>
        </View>

        <Text style={styles.disclaimerText}>
          Calculations are strictly deterministic based on current model inputs.
        </Text>
      </View>

    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC', // lightBackground
  },
  scrollPadding: {
    padding: 24,
    paddingBottom: 60,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  explainerBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 32,
  },
  explainerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  explainerText: {
    fontSize: 13,
    color: '#0284C7',
    lineHeight: 20,
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
    overflow: 'hidden',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dashboardCell: {
    padding: 20,
  },
  cellBorderBottom: {
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dashboardLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dashboardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  sliderContainer: {
    marginBottom: 32,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#64748B',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  track: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    height: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginLeft: -14, // Center the thumb on the value
  },
  sliderLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  limitText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#94A3B8',
  },
  outcomeCard: {
    backgroundColor: '#0F172A', 
    borderRadius: 24,
    padding: 32,
    ...theme.borders.premiumDark,
  },
  outcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  outcomeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  outcomeContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  outcomeBlock: {
    flex: 1,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#94A3B8', 
    marginBottom: 8,
  },
  outcomeHighlight: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF', 
    letterSpacing: -1,
  },
  outcomeSub: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  outcomeDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#334155',
    marginHorizontal: 24,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#475569', 
    marginTop: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
