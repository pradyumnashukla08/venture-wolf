import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';

// Error Boundary for SVGs
class SvgErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Awaiting sufficient data mapping</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

import { useProfile } from '../context/ProfileContext';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

export const TractionGrowthScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth } = useResponsiveLayout();
  const { startupStage, evaluationResult, processedDocIds } = useProfile();
  
  const hasFinancials = processedDocIds.some(id => 
    ['fin_model', 'basic_pnl', 'three_stmt', 'hist_fin', 'bank_stmts', 'bva_sheet', 'audited_fin', 'trial_bal', 'spend_plan', 'basic_cap', 'std_cap'].includes(id)
  );

  const tm = evaluationResult?.traction_metrics || {};
  const fm = evaluationResult?.financial_metrics || {};
  const gtm = evaluationResult?.gtm_strategy || {};

  const formatCurrency = (val: number | undefined | null) => {
    if (!val) return 'N/A';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString()}`;
  };

  const generateSvgPath = (dataPoints: number[] | undefined) => {
    if (!dataPoints || dataPoints.length < 2) return null;
    const max = Math.max(...dataPoints, 1);
    const min = Math.min(...dataPoints, 0);
    const range = max - min;
    
    const width = 280;
    const height = 120;
    const stepX = width / (dataPoints.length - 1);
    
    let path = '';
    dataPoints.forEach((point, i) => {
      const x = 10 + (i * stepX);
      const normalizedY = range === 0 ? 0 : (point - min) / range;
      const y = 140 - (normalizedY * height);
      if (i === 0) path += `M${x},${y} `;
      else path += `L${x},${y} `;
    });
    return path;
  };

  const data = {
    stage: startupStage,
    waitlistCount: tm.waitlist_count ? tm.waitlist_count.toLocaleString() : 'N/A',
    betaConversion: tm.waitlist_count && tm.beta_users ? `${Math.round((tm.beta_users / tm.waitlist_count) * 100)}%` : 'N/A',
    arr: formatCurrency(fm.arr),
    retention: tm.nrr ? `${tm.nrr}%` : 'N/A',
    ltvcac: gtm.ltv_cac_ratio ? `${gtm.ltv_cac_ratio}x` : 'N/A',
    burn: tm.burn_multiple ? `${tm.burn_multiple}x` : 'N/A',
    chartPoints: generateSvgPath(tm.historical_revenue_6m)
  };

  if (!evaluationResult || !hasFinancials) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Traction Map</Text>
          <View style={{ width: 44 }} />
        </View>
        <EcosystemEmptyState 
          featureName="Traction Growth" 
          requiredDocument="Financials (Excel/CSV) & Pitch Deck" 
          iconName="trending-up-outline" 
        />
      </View>
    );
  }

  const isEarlyStage = data.stage === 'Pre-Seed';

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav */}
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Traction Map</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.explainerBox}>
        <Ionicons name="rocket-outline" size={24} color={theme.colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.explainerTitle}>Stage-Aware Analysis ({data.stage})</Text>
          <Text style={styles.explainerText}>
            Our AI dynamically adapts your traction metrics based on your profile's funding stage. {isEarlyStage ? "At Pre-Seed, VCs care strictly about waitlist momentum and beta validation." : "Post-Seed VCs heavily index on Revenue Growth, Net Retention, and LTV:CAC ratios."}
          </Text>
        </View>
      </View>

      <>
          {isEarlyStage ? (
            // PRE-SEED VIEW
            <View style={styles.grid}>
              <View style={[styles.statCard, theme.shadows.premiumLight, { width: halfWidth }]}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF', marginBottom: 16 }]}>
                  <Ionicons name="people" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.statLabel}>WAITLIST SIGNUPS</Text>
                <View style={styles.statValRow}>
                  <Text style={styles.statValue}>{data.waitlistCount}</Text>
                  <Text style={styles.statIncrease}>+15%</Text>
                </View>
              </View>
              <View style={[styles.statCard, theme.shadows.premiumLight, { width: halfWidth }]}>
                <View style={[styles.iconBox, { backgroundColor: '#F0FDF4', marginBottom: 16 }]}>
                  <Ionicons name="funnel" size={20} color="#10B981" />
                </View>
                <Text style={styles.statLabel}>BETA CONVERSION</Text>
                <View style={styles.statValRow}>
                  <Text style={styles.statValue}>{data.betaConversion}</Text>
                  <Text style={styles.statIncrease}>+2%</Text>
                </View>
              </View>
            </View>
          ) : (
            // LATE STAGE VIEW
            <>
              <View style={[styles.dashboardCard, theme.shadows.premiumLight]}>
                <View style={styles.dashboardGrid}>
                  <View style={[styles.dashboardCell, styles.cellBorderBottom, styles.cellBorderRight]}>
                    <View style={styles.cellHeader}>
                      <View style={[styles.smallIconBox, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="cash" size={14} color="#3B82F6" />
                      </View>
                      <Text style={styles.dashboardLabel}>ANNUAL RUN RATE</Text>
                    </View>
                    <View style={styles.statValRow}>
                      <Text style={styles.dashboardValue}>{data.arr}</Text>
                      <Text style={styles.statIncrease}>+18%</Text>
                    </View>
                  </View>

                  <View style={[styles.dashboardCell, styles.cellBorderBottom]}>
                    <View style={styles.cellHeader}>
                      <View style={[styles.smallIconBox, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="sync" size={14} color="#10B981" />
                      </View>
                      <Text style={styles.dashboardLabel}>NET RETENTION</Text>
                    </View>
                    <View style={styles.statValRow}>
                      <Text style={styles.dashboardValue}>{data.retention}</Text>
                      <Text style={styles.statIncrease}>+5%</Text>
                    </View>
                  </View>

                  <View style={[styles.dashboardCell, styles.cellBorderRight]}>
                    <View style={styles.cellHeader}>
                      <View style={[styles.smallIconBox, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="scale" size={14} color="#EF4444" />
                      </View>
                      <Text style={styles.dashboardLabel}>LTV:CAC RATIO</Text>
                    </View>
                    <View style={styles.statValRow}>
                      <Text style={styles.dashboardValue}>{data.ltvcac}</Text>
                      <Text style={styles.statIncrease}>+0.4</Text>
                    </View>
                  </View>

                  <View style={styles.dashboardCell}>
                    <View style={styles.cellHeader}>
                      <View style={[styles.smallIconBox, { backgroundColor: '#FFF7ED' }]}>
                        <Ionicons name="flame" size={14} color="#F97316" />
                      </View>
                      <Text style={styles.dashboardLabel}>BURN MULTIPLE</Text>
                    </View>
                    <View style={styles.statValRow}>
                      <Text style={styles.dashboardValue}>{data.burn}</Text>
                      <Text style={[styles.statIncrease, { color: '#EF4444' }]}>-0.2</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={[styles.chartCard, theme.shadows.premiumLight]}>
                <Text style={styles.chartTitle}>REVENUE VELOCITY</Text>
                <View style={styles.chartArea}>
                  <SvgErrorBoundary>
                    {data.chartPoints ? (
                      <Svg height="150" width="100%" viewBox="0 0 300 150">
                        <Path d="M0,30 L300,30" stroke="#F1F5F9" strokeWidth="1" />
                        <Path d="M0,75 L300,75" stroke="#F1F5F9" strokeWidth="1" />
                        <Path d="M0,120 L300,120" stroke="#F1F5F9" strokeWidth="1" />
                        <Path d={data.chartPoints} stroke={theme.colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <Circle cx="290" cy="20" r="6" fill={theme.colors.primary} />
                      </Svg>
                    ) : (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Awaiting sufficient data mapping</Text>
                      </View>
                    )}
                  </SvgErrorBoundary>
                  
                  <View style={styles.xAxis}>
                    <Text style={styles.xLabel}>JAN</Text>
                    <Text style={styles.xLabel}>FEB</Text>
                    <Text style={styles.xLabel}>MAR</Text>
                    <Text style={styles.xLabel}>APR</Text>
                    <Text style={styles.xLabel}>MAY</Text>
                    <Text style={styles.xLabel}>JUN</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </>

      {/* Footer Action */}
      <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
        <Text style={styles.saveButtonText}>Return to Data Room</Text>
      </TouchableOpacity>
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingBottom: 60 },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  
  explainerBox: { flexDirection: 'row', backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 32 },
  explainerTitle: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  explainerText: { fontSize: 13, color: '#0284C7', lineHeight: 20 },
  
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', marginTop: 16, fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  statValRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statValue: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  statIncrease: { fontSize: 12, color: '#10B981', fontWeight: '900' },
  
  dashboardCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, overflow: 'hidden' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dashboardCell: { width: '50%', padding: 20 },
  cellBorderBottom: { borderBottomWidth: 1, borderColor: '#F1F5F9' },
  cellBorderRight: { borderRightWidth: 1, borderColor: '#F1F5F9' },
  cellHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  dashboardLabel: { fontSize: 10, color: '#64748B', fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  dashboardValue: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },

  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 40 },
  chartTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, color: '#64748B', marginBottom: 24, textTransform: 'uppercase' },
  chartArea: { height: 180 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  xLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, color: '#94A3B8' },
  
  saveButton: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12 },
  errorText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 12 },
});
