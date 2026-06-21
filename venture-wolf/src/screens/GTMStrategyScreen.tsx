// Forces IDE cache refresh
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfile } from '../context/ProfileContext';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

export const GTMStrategyScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet } = useResponsiveLayout();
  const { evaluationResult, processedDocIds } = useProfile();
  
  const hasRequiredDocs = processedDocIds.includes('pitch_deck');

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
  };

  const gtm = evaluationResult?.gtm_strategy || {};

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

        {/* 2x2 Unit Economics Grid */}
        <View style={styles.gridSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UNIT ECONOMICS</Text>
            <TouchableOpacity style={styles.updateBtn}>
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
            {gtm.channels?.map((channel: any, index: number) => {
              const isHigh = channel.status === 'Scaling';
              const isLow = channel.status === 'Saturated';
              const color = isHigh ? '#10B981' : isLow ? '#EF4444' : '#F59E0B';
              const bgColor = isHigh ? '#F0FDF4' : isLow ? '#FEF2F2' : '#FFFBEB';
              
              return (
                <View key={index} style={[styles.channelRow, index === gtm.channels.length - 1 ? { borderBottomWidth: 0 } : {}]}>
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
            {(!gtm.channels || gtm.channels.length === 0) && (
              <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>No channel data extracted</Text>
            )}
          </View>
        </View>

        {/* Experiment Roadmap */}
        <View style={styles.roadmapSection}>
          <Text style={styles.sectionTitle}>EXPERIMENT ROADMAP</Text>
          <View style={styles.timelineContainer}>
            {gtm.experiments?.map((exp: any, index: number) => {
              const isActive = exp.status === 'Active';
              return (
                <React.Fragment key={index}>
                  <View style={styles.timelineNode}>
                    <View style={[styles.timelineCircle, { borderColor: isActive ? '#DBEAFE' : '#E2E8F0', backgroundColor: isActive ? '#EFF6FF' : '#F8FAFC' }]}>
                      {isActive && <Ionicons name="flash" size={10} color={theme.colors.primary} />}
                    </View>
                    <View style={[styles.timelineContent, isActive ? styles.activeSprintCard : { padding: 4 }]}>
                      {isActive ? (
                        <View style={styles.sprintHeader}>
                          <Text style={styles.sprintLabel}>SPRINT {index + 1}</Text>
                          <View style={styles.inProgressBadge}>
                            <View style={styles.pulsingDot} />
                            <Text style={styles.inProgressText}>ACTIVE</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.sprintLabel, { color: '#94A3B8' }]}>SPRINT {index + 1} (UPCOMING)</Text>
                      )}
                      <Text style={styles.sprintTitle}>{exp.title}</Text>
                      <Text style={styles.sprintDesc}>{exp.description}</Text>
                    </View>
                  </View>
                  {index < gtm.experiments.length - 1 && <View style={styles.timelineLine} />}
                </React.Fragment>
              );
            })}
            {(!gtm.experiments || gtm.experiments.length === 0) && (
              <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>No experiments extracted</Text>
            )}
          </View>
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
});
