import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useAuth } from '../context/AuthContext';
import { useProfileStore } from '../store/useProfileStore';

export const Workspace = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet } = useResponsiveLayout();
  
  const { isProfileComplete } = useAuth();
  const { evaluationResult } = useProfileStore();

  const coreProfile = [
    { id: '1', title: 'Company Overview', status: isProfileComplete ? 'done' : 'pending', route: 'Profile', icon: 'business-outline' },
    { id: '2', title: 'Product & Solution', status: isProfileComplete ? 'done' : 'pending', route: 'Profile', icon: 'cube-outline' },
    { id: '4', title: 'Founding Team', status: isProfileComplete ? 'done' : 'pending', route: 'Profile', icon: 'people-outline' },
    { id: '7', title: 'Fundraising Goal', status: isProfileComplete ? 'done' : 'pending', route: 'Profile', icon: 'cash-outline' },
  ];

  const marketMetrics = [
    { id: '3', title: 'Market Opportunity', status: (evaluationResult?.market_score || 0) > 0 ? 'done' : 'pending', route: 'MarketOpportunity', icon: 'pie-chart-outline' },
    { id: '5', title: 'Traction & Growth', status: (evaluationResult?.overall_score || 0) > 0 ? 'done' : 'pending', route: 'Traction', icon: 'trending-up-outline' },
  ];

  const aiVerification = [
    { id: '6', title: 'Data Room & AI Diligence', status: evaluationResult ? 'done' : 'pending', route: 'ImportCenter', icon: 'shield-checkmark-outline' },
  ];

  const allItems = [...coreProfile, ...marketMetrics, ...aiVerification];
  const completedCount = allItems.filter(item => item.status === 'done').length;
  const progressPercent = Math.round((completedCount / allItems.length) * 100);

  let readinessLevel = "Level 1: Ideation";
  if (progressPercent >= 100) readinessLevel = "Level 3: Investor Ready";
  else if (progressPercent >= 50) readinessLevel = "Level 2: Data Room Build";

  const handleShare = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Link Copied!", "Your secure Data Room link has been copied to your clipboard.");
  };

  const renderChecklistCard = (title: string, items: any[]) => {
    const cardCompleted = items.filter(i => i.status === 'done').length;
    const cardProgress = Math.round((cardCompleted / items.length) * 100);

    return (
      <View style={[styles.cardGroup, theme.shadows.premiumLight]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardProgressText, cardProgress === 100 && { color: '#10B981' }]}>{cardProgress}%</Text>
        </View>
        
        {items.map((item, idx) => (
          <TouchableOpacity 
            activeOpacity={0.7}
            key={item.id} 
            style={[styles.checklistItem, idx === items.length - 1 ? { borderBottomWidth: 0 } : {}]}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.itemIconContainer, item.status === 'done' && { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.status === 'done' ? '#10B981' : theme.colors.primary} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={[styles.itemSubtitle, item.status === 'done' ? styles.textSuccess : styles.textPending]}>
                {item.status === 'done' ? 'COMPLETED' : 'ACTION REQUIRED'}
              </Text>
            </View>
            
            <View style={styles.statusIconContainer}>
              {item.status === 'done' ? (
                <View style={[styles.statusIcon, styles.iconDone]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              ) : (
                <View style={[styles.statusIcon, styles.iconPending]}>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>AvasPlot</Text>
            <View style={styles.readinessBadge}>
              <Ionicons name="trophy" size={12} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.readinessText}>{readinessLevel}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Overall Progress Bar Container */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>OVERALL COMPLETION</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#10B981' : theme.colors.primary }]} />
          </View>
          <Text style={[styles.progressText, progressPercent === 100 && { color: '#10B981' }]}>{progressPercent}%</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {renderChecklistCard("Core Profile", coreProfile)}
        {renderChecklistCard("Market & Metrics", marketMetrics)}
        {renderChecklistCard("AI Verification", aiVerification)}

        <TouchableOpacity activeOpacity={0.8} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>CONTINUE BUILDING</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
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
    backgroundColor: theme.colors.lightBackground,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.lightText,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  readinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  readinessText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    color: theme.colors.lightTextMuted,
    marginRight: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0', // Slate 200
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: theme.colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.lightBorder,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cardProgressText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.lightText,
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#10B981', // Emerald
  },
  textPending: {
    color: '#F59E0B', // Amber
  },
  statusIconContainer: {
    marginLeft: 16,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDone: {
    backgroundColor: '#10B981',
  },
  iconPending: {
    backgroundColor: '#CBD5E1',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
