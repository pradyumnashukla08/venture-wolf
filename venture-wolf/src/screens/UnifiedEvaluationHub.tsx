import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';

export const UnifiedEvaluationHub = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = ['Overview', 'Deck', 'Financials', 'Team', 'Activity'];

  return (
    <View style={styles.fullScreen}>
      <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Top Nav */}
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Startup Review</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Profile Header */}
        <View style={styles.headerBlock}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>AV</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.startupName}>AvasPlot</Text>
            <Text style={styles.oneLiner}>AI-driven proptech transactions.</Text>
          </View>
        </View>

        {/* Tabs */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
            {tabs.map(tab => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)} 
                activeOpacity={0.8}
                style={[styles.tabButton, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* AI Investment Memo Explainer */}
        <View style={styles.explainerBox}>
          <Ionicons name="sparkles" size={20} color={theme.colors.secondary} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.explainerTitle}>AI Investment Memo</Text>
            <Text style={styles.explainerText}>
              AvasPlot is a high-velocity proptech platform that programmatically simplifies real estate transactions. They use proprietary ML models to underwrite risk 40% faster than legacy incumbents, showing strong early signs of product-market fit.
            </Text>
          </View>
        </View>

        {/* Metrics Bar */}
        <View style={[styles.metricsBar, theme.borders.premiumDark]}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>STAGE</Text>
            <Text style={styles.metricValue}>Seed</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>THE ASK</Text>
            <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>₹1.5 Cr</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CURR. MRR</Text>
            <Text style={styles.metricValue}>₹12.4 L</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>MOM GTH.</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>24%</Text>
          </View>
        </View>

        {/* Strengths */}
        <Text style={styles.sectionTitle}>Key Strengths</Text>
        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <View style={styles.strengthIconBox}>
              <Ionicons name="checkmark-sharp" size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Founder-Market Fit</Text>
              <Text style={styles.itemDesc}>The CEO brings 8 years of deep domain expertise as a lead underwriter at HDFC.</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <View style={styles.strengthIconBox}>
              <Ionicons name="checkmark-sharp" size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Capital Efficiency</Text>
              <Text style={styles.itemDesc}>Achieved ₹12.4L MRR having burned a total of only ₹18L to date.</Text>
            </View>
          </View>
        </View>

        {/* Risks */}
        <Text style={styles.sectionTitle}>Critical Risks</Text>
        <View style={styles.listContainer}>
          <View style={styles.listItem}>
            <View style={styles.riskIconBox}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Regulatory Exposure</Text>
              <Text style={styles.itemDesc}>RERA compliance framework is currently undocumented in their data room. High risk until clarified.</Text>
            </View>
          </View>
        </View>

      </ResponsiveScrollContainer>

      {/* Sticky Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.8} style={styles.interestedButton}>
          <Ionicons name="flame" size={18} color={theme.colors.darkBackground} style={{ marginRight: 8 }} />
          <Text style={styles.interestedButtonText}>High Interest</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} style={styles.scheduleButton}>
          <Text style={styles.scheduleButtonText}>Schedule Diligence Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
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
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: theme.colors.darkSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...theme.borders.premiumDark,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: -1,
  },
  headerTextCol: {
    flex: 1,
  },
  startupName: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: -1,
    marginBottom: 4,
  },
  oneLiner: {
    fontSize: 14,
    color: theme.colors.darkTextMuted,
  },
  tabsContainer: {
    flexGrow: 0,
    marginBottom: 32,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.darkSurface,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.darkTextMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#0F172A',
  },
  explainerBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    marginBottom: 32,
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
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkSurface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.darkBorder,
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.darkTextMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.darkText,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  listContainer: {
    marginBottom: 32,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkSurface,
    padding: 16,
    borderRadius: 16,
    ...theme.borders.premiumDark,
  },
  strengthIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  riskIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: theme.colors.darkTextMuted,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 32,
    backgroundColor: theme.colors.darkBackground,
    borderTopWidth: 1,
    borderColor: theme.colors.darkBorder,
  },
  interestedButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  interestedButtonText: {
    color: theme.colors.darkBackground,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  scheduleButton: {
    flex: 1.5,
    backgroundColor: theme.colors.darkSurface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.borders.premiumDark,
  },
  scheduleButtonText: {
    color: theme.colors.darkText,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
