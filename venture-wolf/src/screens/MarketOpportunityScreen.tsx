import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfile } from '../context/ProfileContext';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';
import { AIDisclaimer } from '../components/AIDisclaimer';

export const MarketOpportunityScreen = ({ navigation }: any) => {
  const { evaluationResult, processedDocIds } = useProfile();
  
  const hasRequiredDocs = processedDocIds.includes('pitch_deck');

  // Fallback to AI market landscape or use cache
  const aiMarket = evaluationResult?.market_landscape || {};
  const aiCompetitors = aiMarket.competitors || [];

  const [marketData, setMarketData] = useState({
    tam: aiMarket.tam || '₹0',
    sam: aiMarket.sam || '₹0',
    som: aiMarket.som || '₹0',
    competitors: [
      { name: aiCompetitors[0]?.name || 'Competitor 1', weakness: aiCompetitors[0]?.weakness || 'Pending AI competitor analysis.' },
      { name: aiCompetitors[1]?.name || 'Competitor 2', weakness: aiCompetitors[1]?.weakness || 'Pending AI competitor analysis.' },
      { name: aiCompetitors[2]?.name || 'Competitor 3', weakness: aiCompetitors[2]?.weakness || 'Pending AI competitor analysis.' }
    ]
  });

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const cache = await AsyncStorage.getItem('@draft_profile_cache');
        if (cache) {
          const profile = JSON.parse(cache);
          setMarketData(prev => ({
            tam: profile.tam || aiMarket.tam || prev.tam,
            sam: profile.sam || aiMarket.sam || prev.sam,
            som: profile.som || aiMarket.som || prev.som,
            competitors: [
              { name: profile.competitor1 || aiCompetitors[0]?.name || 'Competitor 1', weakness: aiCompetitors[0]?.weakness || 'Pending AI competitor analysis.' },
              { name: profile.competitor2 || aiCompetitors[1]?.name || 'Competitor 2', weakness: aiCompetitors[1]?.weakness || 'Pending AI competitor analysis.' },
              { name: profile.competitor3 || aiCompetitors[2]?.name || 'Competitor 3', weakness: aiCompetitors[2]?.weakness || 'Pending AI competitor analysis.' }
            ]
          }));
        }
      } catch (e) {
        console.log("No valid profile found, using defaults");
      }
    };
    loadProfileData();
  }, [evaluationResult]);

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        {/* Top Nav for Empty State */}
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Market Scope</Text>
          <View style={{ width: 44 }} />
        </View>
        <EcosystemEmptyState 
          featureName="Market Intelligence" 
          requiredDocument="Pitch Deck" 
          iconName="pie-chart-outline" 
        />
      </View>
    );
  }

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav */}
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Market Scope</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* AI Context Explainer */}
      <View style={styles.explainerBox}>
        <Ionicons name="globe-outline" size={24} color={theme.colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.explainerTitle}>AI Market Analysis</Text>
          <Text style={styles.explainerText}>
            We ingested your profile data to map your total addressable market against global VC benchmarks. Furthermore, our AI has actively researched your top 3 competitors to identify their critical vulnerabilities for your pitch.
          </Text>
        </View>
      </View>

      <AIDisclaimer />

      {/* Market Metrics Card */}
      <View style={[styles.metricsContainer, theme.shadows.premiumLight]}>
        <View style={styles.metricItem}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="earth" size={24} color="#3B82F6" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricLabel}>Total Addressable Market (TAM)</Text>
            <Text style={styles.metricDesc}>The absolute global boundary of your revenue.</Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={2}>{marketData.tam}</Text>
        </View>
        <View style={styles.divider} />
        
        <View style={styles.metricItem}>
          <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="map" size={24} color="#10B981" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricLabel}>Serviceable Market (SAM)</Text>
            <Text style={styles.metricDesc}>Target segment within your reach.</Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={2}>{marketData.sam}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="pin" size={24} color="#EF4444" />
          </View>
          <View style={styles.metricTextCol}>
            <Text style={styles.metricLabel}>Obtainable Market (SOM)</Text>
            <Text style={styles.metricDesc}>Realistic capture within 3 years.</Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={2}>{marketData.som}</Text>
        </View>
      </View>

      {/* Competitive Intelligence */}
      <Text style={styles.sectionTitle}>Competitive Vulnerability Mapping</Text>
      <View style={styles.competitorsContainer}>
        {marketData.competitors.map((comp, idx) => (
          <View key={idx} style={[styles.compCard, theme.shadows.premiumLight]}>
            <View style={styles.compHeader}>
              <View style={styles.compAvatar}>
                <Text style={styles.compAvatarText}>{idx + 1}</Text>
              </View>
              <Text style={styles.compName}>{comp.name}</Text>
            </View>
            <View style={styles.weaknessBox}>
              <Text style={styles.weaknessLabel}>AI-Identified Weakness:</Text>
              <Text style={styles.weaknessText}>{comp.weakness}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer Action */}
      <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
        <Text style={styles.saveButtonText}>Sync to Data Room</Text>
      </TouchableOpacity>
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
  },
  content: {
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
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  pageTitle: {
    fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5,
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
    fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  explainerText: {
    fontSize: 13, color: '#0284C7', lineHeight: 20,
  },
  metricsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '50%',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 20, letterSpacing: -0.5,
  },
  competitorsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  compCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  compName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  weaknessBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  weaknessLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  weaknessText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
