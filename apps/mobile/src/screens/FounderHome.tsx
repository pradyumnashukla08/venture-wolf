import React, { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, G, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfileStore } from '../store/useProfileStore';
import { useAuth } from '../context/AuthContext';
import { AuthBottomSheet } from '../components/AuthBottomSheet';
import { registerForPushNotificationsAsync, scheduleDailyStreakReminder } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FounderHome = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth } = useResponsiveLayout();
  const { profileImage, evaluationResult, streakCount, dailyTaskCompletedDate, setDailyTaskCompletedDate, uploadedDocs, fullName } = useProfileStore();
  const { user, isAuthenticated, isProfileComplete, setRoleOffline } = useAuth();
  
  const userName = fullName || user?.displayName || 'Founder';
  const firstName = userName.split(' ')[0];
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  React.useEffect(() => {
    async function setupNotifications() {
      if (isAuthenticated) {
        const hasPermission = await registerForPushNotificationsAsync();
        if (hasPermission) {
          await scheduleDailyStreakReminder();
        }
      }
    }
    setupNotifications();
  }, [isAuthenticated]);

  const handleEcosystemClick = async (route: string) => {
    if (route === 'InvestorTabs') {
      if (!isAuthenticated && setRoleOffline) {
        setRoleOffline('investor');
      } else {
        navigation.navigate('InvestorTabs');
      }
      return;
    }

    if (!isAuthenticated) {
      setPendingRoute(route);
      setShowAuthModal(true);
      return;
    }

    if (route !== 'Profile') {
      try {
        const cached = await AsyncStorage.getItem('@draft_profile_cache');
        if (!cached) {
          navigation.navigate('Profile');
          return;
        }
        const data = JSON.parse(cached);
        if (!data.fullName?.trim() || !data.role?.trim() || !data.companyName?.trim() || !data.pitch?.trim()) {
          navigation.navigate('Profile');
          return;
        }
      } catch (e) {
        navigation.navigate('Profile');
        return;
      }
    }

    if (!isProfileComplete && route !== 'Profile') {
      navigation.navigate('Profile');
      return;
    }

    const hasDocs = uploadedDocs && uploadedDocs.length > 0;
    if (!hasDocs && route !== 'ImportCenter') {
      navigation.navigate('ImportCenter');
      return;
    }

    const hasEval = !!evaluationResult;
    if (hasDocs && !hasEval && route !== 'DeckAnalysis') {
      navigation.navigate('DeckAnalysis');
      return;
    }

    navigation.navigate(route);
  };

  const getGreeting = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const nd = new Date(utc + (3600000 * 5.5)); // IST
    const hour = nd.getHours();

    if (hour >= 5 && hour < 12) return 'GOOD MORNING';
    if (hour >= 12 && hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };
  
  const greeting = getGreeting();
  const today = new Date().toISOString().split('T')[0];
  const isDailyTaskDone = dailyTaskCompletedDate === today;

  // Derive Daily Task
  const hasEval = !!evaluationResult;
  let dailyTaskText = "Upload your Pitch Deck to get AI tasks";
  if (hasEval) {
    if (evaluationResult?.daily_tasks && Array.isArray(evaluationResult.daily_tasks) && evaluationResult.daily_tasks.length > 0) {
      dailyTaskText = evaluationResult.daily_tasks[(streakCount - 1) % evaluationResult.daily_tasks.length];
    } else if (evaluationResult?.red_flags && Array.isArray(evaluationResult.red_flags) && evaluationResult.red_flags.length > 0) {
      dailyTaskText = `Fix this: ${evaluationResult.red_flags[0]}`;
    }
  }

  const toggleDailyTask = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isDailyTaskDone) {
      setDailyTaskCompletedDate(null);
    } else {
      setDailyTaskCompletedDate(today);
    }
  };

  const [activeIssue, setActiveIssue] = useState<any>(null);
  const [checkedAlerts, setCheckedAlerts] = useState<number[]>([]);
  const [hiddenAlerts, setHiddenAlerts] = useState<number[]>([]);

  const handleToggleAlert = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (checkedAlerts.includes(id)) {
      // Unchecking
      setCheckedAlerts(checkedAlerts.filter(x => x !== id));
      setHiddenAlerts(hiddenAlerts.filter(x => x !== id));
    } else {
      // Checking
      setCheckedAlerts([...checkedAlerts, id]);
      // Delay removal so user sees the strikethrough animation
      setTimeout(() => {
        setHiddenAlerts(prev => [...prev, id]);
      }, 500);
    }
  };

  const dailyTaskBonus = isDailyTaskDone ? 2 : 0;
  const alertBonus = checkedAlerts.length * 3;
  const totalBonus = dailyTaskBonus + alertBonus;
  
  const fundabilityScore = hasEval ? Math.min(100, (evaluationResult.overall_score || 50) + totalBonus) : 0; 
  const investorReadiness = hasEval ? Math.min(100, (evaluationResult.market_score || 50) + totalBonus) : 0;
  const fundingProbability = hasEval ? Math.min(100, (evaluationResult.execution_score || 50) + totalBonus) : 0;

  const radius = 64;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fundabilityScore / 100) * circumference;

  const allIssues = (hasEval && Array.isArray(evaluationResult.red_flags) && evaluationResult.red_flags.length > 0) 
    ? evaluationResult.red_flags.map((flag: string, index: number) => ({
        id: index + 1,
        title: 'CRITICAL VULNERABILITY',
        severity: index === 0 ? 'high' : 'medium',
        desc: flag,
        fix: 'Review this risk and generate an Action Plan in Due Diligence.',
        route: 'ActionPlan'
      }))
    : [
    { 
      id: 1, 
      title: 'SYSTEM UNAVAILABLE', 
      severity: 'high', 
      desc: 'The Matrix cannot analyze your startup because you have not uploaded a Pitch Deck.',
      fix: 'Upload your document in the Import Center to establish link.',
      route: 'ImportCenter'
    }
  ];

  // Filter out any that are fully hidden, then take the first 3
  const topIssues = allIssues.filter((issue: any) => !hiddenAlerts.includes(issue.id)).slice(0, 3);

  const GlassCard = ({ children, style, innerStyle, onPress, activeOpacity = 0.8 }: any) => {
    const flatStyle = StyleSheet.flatten(style) || {};
    const outerStyle = {
      width: flatStyle.width,
      marginBottom: flatStyle.marginBottom,
      opacity: flatStyle.opacity,
    };
    
    const innerGlassStyle = { ...flatStyle };
    delete innerGlassStyle.width;
    delete innerGlassStyle.marginBottom;
    delete innerGlassStyle.opacity;

    const content = (
      <BlurView intensity={25} tint="dark" style={[styles.glassCard, innerGlassStyle, { flex: 1 }]}>
        {innerStyle ? <View style={innerStyle}>{children}</View> : children}
      </BlurView>
    );
    if (onPress) {
      return (
        <TouchableOpacity activeOpacity={activeOpacity} onPress={onPress} style={outerStyle}>
          {content}
        </TouchableOpacity>
      );
    }
    return (
      <View style={outerStyle}>
        {content}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#02040A', '#0A1128', '#02040A']} style={styles.container}>
      <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>{greeting}</Text>
            <Text style={styles.userName}>{firstName.toUpperCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.streakBadge}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowStreakModal(true);
              }}
            >
              <LinearGradient colors={['#FF6B00', '#FF2E00']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.streakBadgeBg}>
                <Ionicons name="flame" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.streakText}>{streakCount}</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Profile')}
            >
              {(profileImage || user?.photoURL) ? (
                <Image source={{ uri: profileImage || user?.photoURL || undefined }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" transition={200} />
              ) : (
                <BlurView intensity={30} tint="light" style={styles.iconPlaceholder}>
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </BlurView>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Fundability Metrics OR Premium Empty State */}
        {hasEval ? (
          <GlassCard style={[styles.mainScoreCard, { borderColor: 'rgba(6, 182, 212, 0.3)' }]} onPress={() => handleEcosystemClick('DueDiligence')}>
            <View style={styles.mainScoreCardInner}>
              {/* Glowing Backdrop */}
              <LinearGradient colors={['rgba(6, 182, 212, 0.15)', 'transparent']} style={styles.cardGlowTop} />
              
              <TouchableOpacity 
                style={styles.infoIconAbs}
                onPress={(e: any) => { e.stopPropagation(); setShowScoreModal(true); }}
              >
                <Ionicons name="information-circle" size={24} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.tapToAnalyzeBadge}>
                <LinearGradient colors={['#06B6D4', '#3B82F6']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.tapToAnalyzeBg}>
                  <Ionicons name="scan-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.tapToAnalyzeText}>TAP FOR AI DILIGENCE</Text>
                </LinearGradient>
              </View>

              <View style={styles.scoreRow}>
                <View style={styles.chartCol}>
                  <Text style={styles.cardTitle}>FUNDABILITY SCORE</Text>
                  <View style={styles.chartContainer}>
                    <Svg height="160" width="160" viewBox="0 0 160 160">
                      <Defs>
                        <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor="#06B6D4" stopOpacity="1" />
                          <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
                        </SvgLinearGradient>
                      </Defs>
                      <G rotation="-90" origin="80, 80">
                        <Circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" />
                        <Circle cx="80" cy="80" r={radius} stroke="url(#grad)" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                      </G>
                      <SvgText x="80" y="88" textAnchor="middle" fill="#FFFFFF" fontSize="42" fontWeight="900" fontFamily={Platform.OS === 'ios' ? 'Courier New' : 'monospace'}>
                        {fundabilityScore}
                      </SvgText>
                      <SvgText x="80" y="110" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="bold">
                        / 100
                      </SvgText>
                    </Svg>
                  </View>
                </View>

                <View style={styles.statsCol}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>INVESTOR READINESS</Text>
                    <Text style={[styles.statValue, isDailyTaskDone && { color: '#06B6D4' }]}>{investorReadiness}%</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>FUNDING PROBABILITY</Text>
                    <Text style={[styles.statValue, isDailyTaskDone && { color: '#06B6D4' }]}>{fundingProbability}%</Text>
                    <Text style={styles.statSub}>BASED ON MARKET DATA</Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>
        ) : (
          <GlassCard 
            style={styles.emptyStateCard} 
            onPress={() => {
              if (isAuthenticated) {
                handleEcosystemClick('ImportCenter');
              } else {
                setShowAuthModal(true);
              }
            }}
          >
            <View style={{ padding: 32, alignItems: 'center' }}>
              <LinearGradient colors={['rgba(56, 189, 248, 0.1)', 'transparent']} style={styles.cardGlowTop} />
              <View style={styles.emptyStateIconGlow}>
                <LinearGradient colors={['#38BDF8', '#818CF8']} style={styles.iconGradientCircle}>
                  <Ionicons name={isAuthenticated ? "cloud-upload" : "lock-closed"} size={32} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyStateTitle}>{isAuthenticated ? "INITIATE VC MATRIX" : "AUTHENTICATION REQUIRED"}</Text>
              <Text style={styles.emptyStateSub}>
                {isAuthenticated 
                  ? "Upload your Deck to synchronize with the AI core and generate your fundability vectors." 
                  : "Sign in via Google or Email to synchronize with the AI core and generate your fundability vectors."}
              </Text>
              
              <View style={styles.emptyStateBtn}>
                <LinearGradient colors={['#38BDF8', '#3B82F6']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.emptyStateBtnBg}>
                  <Text style={styles.emptyStateBtnText}>ESTABLISH UPLINK</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </View>
            </View>
          </GlassCard>
        )}

        <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between' }}>
          {/* Critical Issues Terminal */}
          <View style={[styles.listSection, { width: halfWidth }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SYSTEM ALERTS</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('DueDiligence')}>
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>
            
            {topIssues.map((issue: any) => {
              const isChecked = checkedAlerts.includes(issue.id);
              return (
              <GlassCard 
                key={issue.id}
                activeOpacity={0.7} 
                style={[styles.listItem, isChecked && { opacity: 0.6 }]}
                onPress={() => setActiveIssue(issue)}
              >
                <TouchableOpacity onPress={() => handleToggleAlert(issue.id)} style={{ marginRight: 12 }}>
                  <Ionicons name={isChecked ? "checkbox" : "square-outline"} size={24} color={isChecked ? theme.colors.primary : "#94A3B8"} />
                </TouchableOpacity>
                <View style={[styles.iconBox, issue.severity === 'high' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } : { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <MaterialCommunityIcons name="alert-decagram" size={20} color={issue.severity === 'high' ? '#EF4444' : '#F59E0B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listSubtitle, { color: issue.severity === 'high' ? '#EF4444' : '#F59E0B' }, isChecked && { textDecorationLine: 'line-through' }]}>{issue.title}</Text>
                  <Text style={[styles.listText, isChecked && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{issue.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
              </GlassCard>
            )})}
          </View>

          {/* Daily AI Task */}
          <View style={[styles.listSection, { width: halfWidth }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>DIRECTIVE: TODAY</Text>
              <Text style={styles.viewAllText}>{isDailyTaskDone ? 'SECURED' : 'PENDING'}</Text>
            </View>

            <GlassCard 
              activeOpacity={0.7} 
              style={[styles.listItem, isDailyTaskDone && { borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}
              onPress={toggleDailyTask}
            >
              <View style={[styles.checkbox, isDailyTaskDone && styles.checkboxActive]}>
                {isDailyTaskDone && <Ionicons name="checkmark" size={14} color="#000000" />}
              </View>
              <Text style={[styles.listText, {flex: 1}, isDailyTaskDone && { color: '#10B981' }]}>
                {dailyTaskText}
              </Text>
            </GlassCard>

            {isDailyTaskDone && (
              <View style={styles.appreciationMessage}>
                <LinearGradient colors={['rgba(16, 185, 129, 0.1)', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.appreciationBg}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#10B981" style={{ marginRight: 12 }} />
                  <Text style={styles.appreciationText}>Directive Secured. Maintain Protocol.</Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </View>

        {/* High-Contrast Finance CTA */}
        <View style={styles.listSection}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => handleEcosystemClick('Finance')}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient 
              colors={['#FACC15', '#F59E0B']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
              style={{ padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="flash" size={24} color="#0F172A" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', letterSpacing: 1 }}>GENERATE FINANCIAL FORECAST</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* App Ecosystem Grid */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MATRIX TERMINALS</Text>
          </View>
          <View style={styles.gridContainer}>
            {[
              { id: 'MarketOpportunity', icon: 'radar', label: 'MARKET' },
              { id: 'Traction', icon: 'chart-bell-curve-cumulative', label: 'TRACTION' },
              { id: 'ImportCenter', icon: 'database-sync', label: 'IMPORT' },
              { id: 'DeckAnalysis', icon: 'file-document-multiple', label: 'DECK' },
              { id: 'InvestorProfile', icon: 'lock', label: 'VC PROFILE', locked: true },
              { id: 'AIInvestor', icon: 'account-star', label: 'AI INVESTOR' },
              { id: 'DueDiligence', icon: 'shield-search', label: 'DILIGENCE' },
              { id: 'Finance', icon: 'finance', label: 'FINANCIALS' },
              { id: 'PitchPractice', icon: 'microphone-variant', label: 'PITCH PREP' },
              { id: 'GTMStrategy', icon: 'rocket-launch', label: 'GTM STRAT' },
              { id: 'LegalDocs', icon: 'gavel', label: 'LEGAL DOCS' },
            ].map((item, index) => (
              <GlassCard 
                key={index}
                activeOpacity={0.7} 
                style={[styles.gridItem, { width: isTablet ? '23%' : '31%', opacity: item.locked ? 0.4 : 1 }]} 
                onPress={() => handleEcosystemClick(item.id)}
              >
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <View style={styles.gridIconWrapper}>
                    <MaterialCommunityIcons name={item.icon as any} size={28} color={item.locked ? '#475569' : '#06B6D4'} />
                  </View>
                  <Text style={[styles.gridItemText, item.locked && { color: '#475569' }]}>{item.label}</Text>
                </View>
              </GlassCard>
            ))}

            <View style={{ width: isTablet ? '23%' : '31%' }} />
            <View style={{ width: isTablet ? '23%' : '31%' }} />
          </View>
        </View>
      </ResponsiveScrollContainer>

      {/* Auth Modal */}
      <AuthBottomSheet 
        visible={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={() => {
          setShowAuthModal(false);
          navigation.navigate('Profile');
        }}
      />

      {/* ISSUE RESOLUTION MODAL */}
      {activeIssue && (
        <Modal visible transparent animationType="slide">
          <BlurView intensity={60} tint="dark" style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveIssue(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
              
              <View style={[styles.modalIconBox, activeIssue.severity === 'high' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } : { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="warning" size={32} color={activeIssue.severity === 'high' ? '#EF4444' : '#F59E0B'} />
              </View>
              
              <Text style={styles.modalTitle}>{activeIssue.title}</Text>
              
              <View style={styles.modalInsightBox}>
                <Text style={styles.modalInsightLabel}>AI DIAGNOSTIC</Text>
                <Text style={styles.modalInsightText}>{activeIssue.desc}</Text>
              </View>

              <View style={styles.modalFixBox}>
                <Text style={styles.modalFixLabel}>RECOMMENDED ACTION</Text>
                <Text style={styles.modalFixText}>{activeIssue.fix}</Text>
              </View>

              <TouchableOpacity 
                style={styles.modalActionBtnWrapper}
                activeOpacity={0.8}
                onPress={() => {
                  const route = activeIssue.route;
                  setActiveIssue(null);
                  navigation.navigate(route);
                }}
              >
                <LinearGradient colors={['#06B6D4', '#3B82F6']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.modalActionBtnBg}>
                  <Text style={styles.modalActionBtnText}>EXECUTE PROTOCOL</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Modal>
      )}

      {/* STREAK MODAL */}
      <Modal visible={showStreakModal} transparent animationType="fade">
        <BlurView intensity={60} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowStreakModal(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
            
            <View style={[styles.modalIconBox, { backgroundColor: 'rgba(255, 107, 0, 0.1)', padding: 20, borderRadius: 60, marginBottom: 16 }]}>
              <Text style={{ fontSize: 48 }}>🔥</Text>
            </View>
            
            <Text style={styles.modalTitle}>{streakCount} DAY MOMENTUM</Text>
            
            <View style={styles.modalInsightBox}>
              <Text style={styles.modalInsightLabel}>SYSTEM DIRECTIVE</Text>
              <Text style={styles.modalInsightText}>Log in every day and complete your Daily AI Task to build founder momentum. Consistency is the primary indicator of founder execution.</Text>
            </View>

            <TouchableOpacity 
              style={styles.modalActionBtnWrapper}
              activeOpacity={0.8}
              onPress={() => setShowStreakModal(false)}
            >
              <LinearGradient colors={['#FF6B00', '#FF2E00']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.modalActionBtnBg}>
                <Text style={styles.modalActionBtnText}>MAINTAIN MOMENTUM</Text>
                <Ionicons name="rocket" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* SCORE LOGIC MODAL */}
      <Modal visible={showScoreModal} transparent animationType="slide">
        <BlurView intensity={60} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowScoreModal(false)}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
            
            <View style={[styles.modalIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: 20, borderRadius: 60, marginBottom: 16 }]}>
              <Ionicons name="calculator" size={32} color="#06B6D4" />
            </View>
            
            <Text style={styles.modalTitle}>ALGORITHM MATRIX</Text>
            
            <View style={styles.modalInsightBox}>
              <Text style={styles.modalInsightLabel}>FUNDABILITY SCORE ({fundabilityScore}/100)</Text>
              <Text style={styles.modalInsightText}>Weighted aggregate of the 5 core AI Evaluation Vectors extracted from your pitch deck and data room.</Text>
            </View>

            <View style={[styles.modalInsightBox, { marginTop: 12 }]}>
              <Text style={styles.modalInsightLabel}>INVESTOR READINESS ({investorReadiness}%)</Text>
              <Text style={styles.modalInsightText}>Measures if TAM/SAM/SOM sizing and competitive moats are clearly articulated and verified against benchmarks.</Text>
            </View>

            <View style={[styles.modalInsightBox, { marginTop: 12, marginBottom: 24 }]}>
              <Text style={styles.modalInsightLabel}>FUNDING PROBABILITY ({fundingProbability}%)</Text>
              <Text style={styles.modalInsightText}>Cross-references current runway, traction, and unit economics against historically funded startups.</Text>
            </View>

            <TouchableOpacity 
              style={styles.modalActionBtnWrapper}
              activeOpacity={0.8}
              onPress={() => setShowScoreModal(false)}
            >
              <LinearGradient colors={['#06B6D4', '#3B82F6']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.modalActionBtnBg}>
                <Text style={styles.modalActionBtnText}>ACKNOWLEDGE</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 36,
    marginTop: 12,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#64748B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  streakBadgeBg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  iconPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    width: '100%', // Take up full width of parent wrapper
  },
  mainScoreCard: {
    marginBottom: 36,
  },
  mainScoreCardInner: {
    padding: 24,
  },
  cardGlowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  infoIconAbs: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  tapToAnalyzeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  tapToAnalyzeBg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tapToAnalyzeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 20,
    alignSelf: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCol: {
    flex: 1,
    paddingLeft: 24,
    justifyContent: 'center',
  },
  statBlock: {
    marginBottom: 28,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statSub: {
    fontSize: 9,
    letterSpacing: 1,
    color: '#475569',
    marginTop: 4,
    fontWeight: 'bold',
  },
  emptyStateCard: {
    marginBottom: 36,
  },
  emptyStateIconGlow: {
    marginBottom: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGradientCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyStateSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateBtn: {
    borderRadius: 100,
    overflow: 'hidden',
    width: '80%',
  },
  emptyStateBtnBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  emptyStateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  listSection: {
    marginBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  viewAllText: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#06B6D4',
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  listText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  appreciationMessage: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  appreciationBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appreciationText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 16,
  },
  gridIconWrapper: {
    marginBottom: 16,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gridItemText: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '900',
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalInsightBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  modalInsightLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalInsightText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  modalFixBox: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 32,
  },
  modalFixLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalFixText: {
    fontSize: 14,
    color: '#34D399',
    fontWeight: 'bold',
  },
  modalActionBtnWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalActionBtnBg: {
    flexDirection: 'row',
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
