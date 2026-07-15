import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { AIDisclaimer } from '../components/AIDisclaimer';

import { useProfileStore } from '../store/useProfileStore';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';

export const DeckDiagnosticScreen = ({ navigation }: any) => {
  const { evaluationResult, processedDocIds } = useProfileStore();
  
  // Dynamically generate issues from AI red flags
  const aiIssues = evaluationResult?.red_flags?.map((flag: string, index: number) => ({
    id: index + 1,
    slide: `AI Finding #${index + 1}`,
    title: 'Identified Vulnerability',
    severity: index === 0 ? 'CRITICAL' : 'WARNING',
    color: index === 0 ? '#EF4444' : '#F59E0B',
    icon: index === 0 ? 'warning' : 'alert-circle',
    desc: flag,
    fix: 'Address this finding directly in your pitch narrative and appendix data.'
  })) || [];

  const [selectedIssue, setSelectedIssue] = useState<typeof aiIssues[0] | null>(null);
  
  const hasRequiredDocs = processedDocIds?.includes('pitch_deck');

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Deck Diagnostic</Text>
          <View style={{ width: 44 }} />
        </View>
        <EcosystemEmptyState 
          featureName="Deck Diagnostic" 
          requiredDocument="Pitch Deck" 
          iconName="document-text-outline" 
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
        <Text style={styles.pageTitle}>Deck Diagnostic</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* AI Explainer Box */}
      <View style={styles.explainerBox}>
        <Ionicons name="hardware-chip" size={24} color={theme.colors.primary} style={{ marginRight: 12, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.explainerTitle}>How it works</Text>
          <Text style={styles.explainerText}>
            Our AI engine parses your PDF and analyzes it against 10,000+ funded seed decks. It spots missing narratives, unit economic gaps, and slide bloat before you ever send it to a VC.
          </Text>
        </View>
      </View>

      <AIDisclaimer />

      {/* Score Header */}
      <View style={[styles.scoreCard, theme.shadows.premiumLight]}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreTitle}>AI Readiness Score</Text>
          <View style={styles.scoreValueRow}>
            <Text style={styles.scoreBig}>{evaluationResult.overall_score || 'N/A'}</Text>
            <Text style={styles.scoreSmall}>/100</Text>
          </View>
          <Text style={styles.scoreVerdict}>
            {evaluationResult.overall_score > 85 ? 'Strong Match' : evaluationResult.overall_score > 70 ? 'Sub-optimal for Series A' : 'Needs Significant Revision'}
          </Text>
        </View>
        <View style={styles.scoreRight}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Team Score</Text>
            <Text style={styles.statValue}>{evaluationResult.team_score || 'N/A'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Red Flags</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{evaluationResult.red_flags?.length || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Market Score</Text>
            <Text style={styles.statValue}>{evaluationResult.market_score || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Issues Found */}
      <Text style={styles.sectionTitle}>Critical Vulnerabilities</Text>
      <View style={styles.issuesContainer}>
        {aiIssues.map((issue: any) => (
          <TouchableOpacity 
            key={issue.id}
            activeOpacity={0.8}
            onPress={() => setSelectedIssue(issue)}
            style={[styles.issueCard, theme.shadows.premiumLight]}
          >
            <View style={styles.issueHeader}>
              <View style={[styles.severityBadge, { backgroundColor: `${issue.color}15`, borderColor: `${issue.color}30` }]}>
                <Ionicons name={issue.icon as any} size={12} color={issue.color} style={{ marginRight: 4 }} />
                <Text style={[styles.severityText, { color: issue.color }]}>{issue.severity}</Text>
              </View>
              <Text style={styles.slideReference}>{issue.slide}</Text>
            </View>
            <Text style={styles.issueCardTitle}>{issue.title}</Text>
            <Text style={styles.issueCardDesc} numberOfLines={2}>{issue.desc}</Text>
            <View style={styles.issueFooter}>
              <Text style={styles.viewFixText}>View AI Fix</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Details */}
      <Modal visible={selectedIssue !== null} transparent animationType="slide" onRequestClose={() => setSelectedIssue(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedIssue(null)}>
          <Pressable style={[styles.modalContent, theme.shadows.premiumLight]} onPress={(e) => e.stopPropagation()}>
            {selectedIssue && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalSlideText}>{selectedIssue.slide}</Text>
                  <TouchableOpacity onPress={() => setSelectedIssue(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalTitle}>{selectedIssue.title}</Text>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>The Problem</Text>
                  <Text style={styles.modalText}>{selectedIssue.desc}</Text>
                </View>

                <View style={[styles.modalSection, styles.fixBox]}>
                  <Text style={[styles.modalSectionTitle, { color: '#047857' }]}>AI Recommended Fix</Text>
                  <Text style={[styles.modalText, { color: '#065F46', fontWeight: '500' }]}>{selectedIssue.fix}</Text>
                </View>

                <TouchableOpacity style={styles.gotItBtn} onPress={() => setSelectedIssue(null)}>
                  <Text style={styles.gotItText}>Mark as Understood</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Footer Action */}
      <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
        <Ionicons name="cloud-upload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.actionButtonText}>Upload New Revision</Text>
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
  scoreCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0',
  },
  scoreLeft: {
    flex: 1, borderRightWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center',
  },
  scoreTitle: {
    fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  scoreValueRow: {
    flexDirection: 'row', alignItems: 'baseline', marginBottom: 4,
  },
  scoreBig: {
    fontSize: 56, fontWeight: '900', color: theme.colors.primary, letterSpacing: -2, lineHeight: 56,
  },
  scoreSmall: {
    fontSize: 20, fontWeight: 'bold', color: '#CBD5E1', marginLeft: 4,
  },
  scoreVerdict: {
    fontSize: 12, fontWeight: 'bold', color: '#EF4444',
  },
  scoreRight: {
    flex: 1.2, paddingLeft: 24, justifyContent: 'center', gap: 12,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statLabel: {
    fontSize: 12, color: '#64748B', fontWeight: '500',
  },
  statValue: {
    fontSize: 16, fontWeight: '900', color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 20, letterSpacing: -0.5,
  },
  issuesContainer: {
    marginBottom: 40, gap: 16,
  },
  issueCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  issueHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  severityBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  severityText: {
    fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  slideReference: {
    fontSize: 12, fontWeight: 'bold', color: '#64748B',
  },
  issueCardTitle: {
    fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8,
  },
  issueCardDesc: {
    fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 16,
  },
  issueFooter: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, gap: 8,
  },
  viewFixText: {
    fontSize: 13, fontWeight: 'bold', color: theme.colors.primary,
  },
  actionButton: {
    flexDirection: 'row', backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: 'bold',
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  modalSlideText: {
    fontSize: 13, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 24, lineHeight: 32,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 12, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  modalText: {
    fontSize: 15, color: '#334155', lineHeight: 24,
  },
  fixBox: {
    backgroundColor: '#ECFDF5', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0',
  },
  gotItBtn: {
    backgroundColor: theme.colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 16,
  },
  gotItText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: 'bold',
  },
});
