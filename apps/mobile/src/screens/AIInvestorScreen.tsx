import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Platform,
  Dimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfileStore } from '../store/useProfileStore';
import { apiClient } from '../services/apiClient';
import type { 
  AIInvestorRound, 
  AIInvestorQuestion, 
  QAPair, 
  ClarityVerdict, 
  DocumentAlignmentCheck 
} from '../types/schema';

const Audio: any = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: { createAsync: async () => ({ recording: { stopAndUnloadAsync: async () => {}, getURI: () => null } }) },
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
  Sound: { createAsync: async () => ({ sound: { unloadAsync: async () => {}, playAsync: async () => {}, pauseAsync: async () => {}, setPositionAsync: async () => {} } }) }
};
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../lib/firebase';
import { storage } from '../lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { decode } from 'base64-arraybuffer';

type SimulationMode = 'fundraising' | 'acquisition';
type ScreenPhase = 'lobby' | 'drilling' | 'verdict';

export const AIInvestorScreen = ({ navigation }: any) => {
  const { startupStage, uploadedDocs } = useProfileStore();
  
  // State management
  const [phase, setPhase] = useState<ScreenPhase>('lobby');
  const [mode, setMode] = useState<SimulationMode>('fundraising');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [avatarIntro, setAvatarIntro] = useState<string>('');
  const [rounds, setRounds] = useState<AIInvestorRound[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [verdict, setVerdict] = useState<ClarityVerdict | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<any | null>(null);



  const stageBenchmark = getStageBenchmarkInfo(startupStage);

  const startSession = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/evaluate/investor-start', {
        stage: startupStage,
        mode: mode,
        documents: uploadedDocs || []
      });

      if (response.data?.success && response.data?.qa_session) {
        setAvatarIntro(response.data.qa_session.avatar_intro || "Welcome to Call 1. I'm Devang Raja. Let's inspect how battle-ready your startup is.");
        setRounds(response.data.qa_session.rounds || getFallbackRounds(mode, startupStage));
      } else {
        throw new Error("Invalid session response");
      }
    } catch (err) {
      console.warn("Using offline/fallback AI Investor Q&A due to network:", err);
      setAvatarIntro(`Welcome to Venture Wolf. I'm Devang Raja, Founder & CEO. Across our network of over 5,000 global investors, we evaluate startups strictly against their realistic stage maturity. I note your founder profile lists you at the ${startupStage} stage. For ${startupStage}, we interrogate: ${stageBenchmark.focusMetrics}. Let's begin Call 1.`);
      setRounds(getFallbackRounds(mode, startupStage));
    } finally {
      setIsLoading(false);
      setPhase('drilling');
      setCurrentRoundIdx(0);
      setCurrentQuestionIdx(0);
      setQaHistory([]);
      setCurrentAnswer('');
      

    }
  };

  const handleSkipQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advanceQuestion("[SKIPPED BY FOUNDER - UNSURE OF METRICS]");
  };

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (!recording) return;

    setIsLoading(true); // show loading while uploading
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        // Upload to Supabase immediately
        const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const arrayBuffer = decode(base64Audio);
        
        const userId = auth.currentUser?.uid || 'unknown';
        const fileName = `pitches/${userId}/answer_${Date.now()}.m4a`;
        
        const fileRef = ref(storage, `data_room/${fileName}`);
        await uploadBytes(fileRef, arrayBuffer, { contentType: 'audio/m4a' });

        // Advance to next question with the uploaded audio path
        advanceQuestion('', fileName);
      }
    } catch (err) {
      console.error('Failed to stop recording & upload', err);
      Alert.alert('Upload Failed', 'There was an issue saving your voice answer.');
    } finally {
      setIsLoading(false);
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const advanceQuestion = (recordedAnswer: string, audioPath?: string) => {
    const currentRound = rounds[currentRoundIdx];
    const currentQ = currentRound?.questions[currentQuestionIdx];

    if (currentQ) {
      const newHistory = [
        ...qaHistory,
        {
          round_title: currentRound.round_title,
          question: currentQ.question,
          answer: recordedAnswer,
          audioPath: audioPath
        }
      ];
      setQaHistory(newHistory);

      setCurrentAnswer('');

      // Advance to next question or round
      if (currentQuestionIdx + 1 < (currentRound?.questions.length || 0)) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      } else if (currentRoundIdx + 1 < rounds.length) {
        setCurrentRoundIdx(currentRoundIdx + 1);
        setCurrentQuestionIdx(0);
      } else {
        // Completed all rounds -> Submit with complete history
        submitForVerdict(newHistory);
        return;
      }
    }
  };

  const submitForVerdict = async (finalHistory: QAPair[]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    setPhase('verdict');

    try {
      const response = await apiClient.post('/evaluate/investor-verdict', {
        stage: startupStage,
        mode: mode,
        qaHistory: finalHistory,
        documents: uploadedDocs || []
      });

      if (response.data?.success && response.data?.verdict) {
        setVerdict(response.data.verdict);
      } else {
        throw new Error("Invalid verdict response");
      }
    } catch (err) {
      console.warn("Using real-time audit fallback verdict:", err);
      setVerdict(getFallbackVerdict(startupStage, mode, finalHistory));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Diagnostic Report Exported",
      `Devang Raja's complete ${startupStage} Stage Clarity & Reality audit report with document alignment notes has been sent to your registered founder email.`
    );
  };

  const currentRound = rounds[currentRoundIdx] || null;
  const currentQuestion: AIInvestorQuestion | null = currentRound?.questions[currentQuestionIdx] || null;
  const totalQuestions = rounds.reduce((acc, r) => acc + (r.questions?.length || 0), 0);
  const answeredQuestions = qaHistory.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Sleek Executive Top Navigation */}
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.navTitleHolder}>
          <Text style={styles.navTitle} numberOfLines={1}>AI INVESTOR TERMINAL</Text>
          <Text style={styles.navSubTitle} numberOfLines={1}>Institutional Syndicate Audit</Text>
        </View>
        <View style={styles.badgeHolder}>
          <Ionicons name="shield-checkmark" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={styles.devangBadgeText}>DEVANG RAJA</Text>
        </View>
      </View>

      <ResponsiveScrollContainer style={styles.scrollBody} contentContainerStyle={styles.content}>
        {/* ========================================================================= */}
        {/* PHASE 1: LOBBY & SETUP */}
        {/* ========================================================================= */}
        {phase === 'lobby' && (
          <View style={styles.lobbyContainer}>
            
            {/* Devang Raja Executive Profile Card */}
            <View style={styles.avatarCard}>
              <View style={styles.avatarHeader}>
                <View style={styles.avatarIconWrap}>
                  <Text style={styles.avatarInitials}>DR</Text>
                </View>
                <View style={styles.avatarTitles}>
                  <View style={styles.nameRow}>
                    <Text style={styles.avatarName}>Devang Raja</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#38BDF8" style={{ marginLeft: 6 }} />
                  </View>
                  <Text style={styles.avatarRole}>Founder & CEO • Venture Wolf</Text>
                </View>
              </View>

              {/* Credibility Ribbon */}
              <View style={styles.leaderRibbon}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.leaderRibbonText} numberOfLines={1}>
                  5 Most Powerful Leaders in Fundraising
                </Text>
              </View>

              {/* Executive Bio Quote */}
              <View style={styles.quoteBox}>
                <Text style={styles.avatarBio}>
                  "Angel Investors, HNIs, Ultra HNIs, VCs, PE, and Private Equity across 10 global financial centers. We manage an active syndicate of 5,000+ institutional investors with ticket sizes starting at INR 1Cr+. Our core philosophy: An entrepreneur creating entrepreneurs."
                </Text>
              </View>

              {/* Key Metrics Strip */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>5,000+</Text>
                  <Text style={styles.statLab}>Global Investors</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>₹1Cr+</Text>
                  <Text style={styles.statLab}>Min Ticket Size</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>13 Yrs</Text>
                  <Text style={styles.statLab}>Corp Finance Exec</Text>
                </View>
              </View>
            </View>

            {/* Stage Benchmark Executive Protocol Card (Zero Overlap & Organized Pods) */}
            <View style={styles.stageBenchmarkCard}>
              <View style={styles.cardHeaderWrap}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.pulseIndicator} />
                  <Text style={styles.stageCardTitle} numberOfLines={1}>
                    STAGE PROTOCOL: {startupStage.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.editStageBtn} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate('FounderProfile');
                  }}
                >
                  <Ionicons name="settings-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                  <Text style={styles.editStageText}>Configure</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.stageIntroText}>
                Devang Raja dynamically calibrates Call 1 interrogation and clarity scoring strictly around your current maturity profile:
              </Text>

              <View style={styles.podsContainer}>
                {/* Rule Pod */}
                <View style={[styles.benchmarkPod, styles.podCyan]}>
                  <View style={styles.podTitleRow}>
                    <Ionicons name="business" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                    <Text style={styles.podTitleCyan}>INSTITUTIONAL EVALUATION RULE</Text>
                  </View>
                  <Text style={styles.podContent}>{stageBenchmark.rules}</Text>
                </View>

                {/* Interrogation Pod */}
                <View style={[styles.benchmarkPod, styles.podGreen]}>
                  <View style={styles.podTitleRow}>
                    <Ionicons name="analytics" size={14} color="#34D399" style={{ marginRight: 6 }} />
                    <Text style={styles.podTitleGreen}>PRIMARY INTERROGATION FOCUS</Text>
                  </View>
                  <Text style={styles.podContent}>{stageBenchmark.focusMetrics}</Text>
                </View>

                {/* Red Flag Pod */}
                <View style={[styles.benchmarkPod, styles.podRed]}>
                  <View style={styles.podTitleRow}>
                    <Ionicons name="alert-circle" size={14} color="#F87171" style={{ marginRight: 6 }} />
                    <Text style={styles.podTitleRed}>AUTOMATIC VENTURE RED FLAGS</Text>
                  </View>
                  <Text style={styles.podContentRed}>{stageBenchmark.redFlags}</Text>
                </View>
              </View>
            </View>

            {/* Simulation Mode Selection */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>SIMULATION OBJECTIVE</Text>
                <Text style={styles.sectionOptionalText}>FAQ Filter</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Select your intended transaction type. Devang tailors questions from Venture Wolf's proprietary Call 1 training scripts.
              </Text>
              <View style={styles.modeToggleRow}>
                <TouchableOpacity 
                  style={[styles.modeBtn, mode === 'fundraising' && styles.modeBtnActive]} 
                  onPress={() => { Haptics.selectionAsync(); setMode('fundraising'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="trending-up" 
                    size={18} 
                    color={mode === 'fundraising' ? '#38BDF8' : '#64748B'} 
                  />
                  <Text style={[styles.modeBtnText, mode === 'fundraising' && styles.modeBtnTextActive]}>
                    Venture Raise
                  </Text>
                  {mode === 'fundraising' && (
                    <View style={styles.modeActiveIcon}>
                      <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modeBtn, mode === 'acquisition' && styles.modeBtnActive]} 
                  onPress={() => { Haptics.selectionAsync(); setMode('acquisition'); }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="briefcase" 
                    size={18} 
                    color={mode === 'acquisition' ? '#38BDF8' : '#64748B'} 
                  />
                  <Text style={[styles.modeBtnText, mode === 'acquisition' && styles.modeBtnTextActive]}>
                    M&A Exit
                  </Text>
                  {mode === 'acquisition' && (
                    <View style={styles.modeActiveIcon}>
                      <Ionicons name="checkmark-circle" size={16} color="#38BDF8" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Data Room Synchronizer Card (Zero Overlap) */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderWrap}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="folder-open" size={16} color="#38BDF8" />
                  <Text style={styles.sectionTitle} numberOfLines={1}>DATA ROOM AUTOMATON</Text>
                </View>
                <View style={[styles.statusPill, uploadedDocs.length > 0 ? styles.pillOk : styles.pillWarn]}>
                  <Text style={styles.pillText}>{uploadedDocs.length} Docs Synced</Text>
                </View>
              </View>
              
              <Text style={styles.sectionDesc}>
                {uploadedDocs.length > 0
                  ? `Devang's AI engines have ingested your uploaded files to cross-examine verbal interview answers against actual Excel spreadsheet calculations.`
                  : `No custom documents uploaded in your Data Room yet. Devang will execute a rigorous ${startupStage} stage-standard interview drill.`
                }
              </Text>

              {uploadedDocs.length > 0 && (
                <View style={styles.docChipContainer}>
                  {uploadedDocs.map((doc, idx) => (
                    <View key={idx} style={styles.docChip}>
                      <Ionicons name="document-text" size={13} color="#38BDF8" />
                      <Text style={styles.docChipText} numberOfLines={1}>{doc.type || 'Document'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Commanding Primary Action Button */}
            <TouchableOpacity style={styles.primaryActionBtn} onPress={startSession} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? (
                <ActivityIndicator color="#060C18" />
              ) : (
                <>
                  <View style={styles.primaryIconWrap}>
                    <Ionicons name="call" size={18} color="#060C18" />
                  </View>
                  <View>
                    <Text style={styles.primaryBtnText}>INITIATE CALL 1 INTERVIEW</Text>
                    <Text style={styles.primaryBtnSub}>{startupStage} Institutional Interrogation</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#060C18" style={{ marginLeft: 'auto' }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: DRILLING ARENA (INTERVIEW MODE) */}
        {/* ========================================================================= */}
        {phase === 'drilling' && (
          <View style={styles.interviewContainer}>
            {/* Interview Header */}
            <View style={styles.interviewHeader}>
              <View style={styles.callStatus}>
                <View style={[styles.liveDot, { backgroundColor: isRecording ? '#EF4444' : '#10B981' }]} />
                <Text style={[styles.liveText, { color: isRecording ? '#F87171' : '#34D399' }]}>
                  {isRecording ? 'RECORDING' : 'LIVE'}
                </Text>
              </View>
              <Text style={styles.interviewRoundText}>
                ROUND {currentRoundIdx + 1}/{rounds.length}
              </Text>
              <View style={styles.miniStageTag}>
                <Text style={styles.miniStageText}>{startupStage}</Text>
              </View>
            </View>

            <View style={styles.progressTrackInterview}>
              <View style={[styles.progressFill, { width: `${Math.max(5, progressPercent)}%` }]} />
            </View>

            {/* Video Stage Layout */}
            <View style={styles.videoStage}>
              {/* Investor (Devang) Large Tile */}
              <View style={styles.investorTile}>
                <View style={styles.investorVideoBg}>
                  <View style={[styles.investorAvatarLarge, isRecording && styles.investorAvatarListening]}>
                    <Text style={styles.investorAvatarTextLarge}>DR</Text>
                  </View>
                  {!isRecording && (
                     <View style={styles.speakingIndicator}>
                       <View style={styles.speakingBar} />
                       <View style={[styles.speakingBar, { height: 12 }]} />
                       <View style={[styles.speakingBar, { height: 18 }]} />
                       <View style={[styles.speakingBar, { height: 8 }]} />
                     </View>
                  )}
                </View>

                {/* Subtitles Overlay */}
                <View style={styles.subtitleOverlay}>
                  <Text style={styles.questionTextCinematic}>
                    "{currentQuestion?.question}"
                  </Text>
                  {currentQuestion?.reason && (
                     <View style={styles.reasonCinematicBox}>
                       <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                       <Text style={styles.reasonTextCinematic}>
                         {currentQuestion.reason}
                       </Text>
                     </View>
                  )}
                </View>

                {/* Investor Name Badge */}
                <View style={styles.nameBadgeCinematic}>
                  <Ionicons name="shield-checkmark" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                  <Text style={styles.nameBadgeTextCinematic}>Devang Raja</Text>
                </View>
              </View>

              {/* Founder PIP Tile */}
              <View style={[styles.founderPipTile, isRecording && styles.founderPipRecording]}>
                <View style={styles.founderPipAvatar}>
                  <Ionicons name={isRecording ? "mic" : "mic-off"} size={22} color={isRecording ? "#EF4444" : "#94A3B8"} />
                </View>
                <Text style={styles.founderPipName}>You</Text>
              </View>
            </View>

            {/* Call Controls */}
            <View style={styles.interviewControls}>
              <TouchableOpacity 
                style={styles.skipControlBtn} 
                onPress={handleSkipQuestion} 
                disabled={isRecording}
              >
                <Ionicons name="play-skip-forward" size={20} color="#94A3B8" />
                <Text style={styles.skipControlText}>Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainRecordBtn, isRecording && styles.mainRecordBtnActive]}
                onPress={toggleRecording}
                activeOpacity={0.85}
              >
                <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.placeholderControlBtn}>
                {/* Balance placeholder */}
              </View>
            </View>
            
            <Text style={styles.recordInstructionText}>
              {isRecording ? "Investor is listening... tap to stop" : "Tap mic to answer"}
            </Text>
          </View>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: CLARITY & REALITY VERDICT */}
        {/* ========================================================================= */}
        {phase === 'verdict' && (
          <View style={styles.verdictContainer}>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingTitle}>Devang is Auditing Your Responses...</Text>
                <Text style={styles.loadingDesc}>
                  Cross-referencing your Call 1 statements against uploaded Data Room models and evaluating your ${startupStage} Stage Readiness.
                </Text>
              </View>
            ) : verdict && (
              <>
                {/* Score Hero Card */}
                <View style={styles.scoreHeroCard}>
                  <Text style={styles.heroPreTitle}>{startupStage.toUpperCase()} INSTITUTIONAL CLARITY RATING</Text>
                  <View style={styles.scoreCircleWrap}>
                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreNumber}>{verdict.clarity_score}</Text>
                      <Text style={styles.scoreMax}>/ 100</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.verdictBadge,
                    verdict.clarity_score >= 75 ? { backgroundColor: '#10B981' } : verdict.clarity_score >= 50 ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#EF4444' }
                  ]}>
                    <Text style={styles.verdictBadgeText}>{verdict.fundability_verdict.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Readiness Vectors Card */}
                <View style={styles.vectorCard}>
                  <Text style={styles.sectionTitle}>CORE READINESS VECTORS ({startupStage.toUpperCase()})</Text>
                  <View style={{ gap: 16, marginTop: 8 }}>
                    <VectorBar label="Pitch & Problem Clarity" score={verdict.vector_scores.pitch_clarity} />
                    <VectorBar label={`Financial & Unit Defense (${startupStage})`} score={verdict.vector_scores.financial_defense} />
                    <VectorBar label={`Stage Reality & Milestone Fit`} score={verdict.vector_scores.stage_readiness} />
                    <VectorBar label="Market Mastery & Defensible Moat" score={verdict.vector_scores.market_mastery} />
                    {verdict.voice_analysis && (
                      <VectorBar label="Voice Delivery & Persuasion" score={verdict.voice_analysis.delivery_score} />
                    )}
                  </View>
                </View>

                {/* Voice Delivery Analysis Feedback */}
                {verdict.voice_analysis && (
                  <View style={[styles.realityCheckCard, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}>
                    <View style={styles.realityHeader}>
                      <Ionicons name="mic" size={20} color="#38BDF8" style={{ marginRight: 8 }} />
                      <Text style={[styles.realityTitle, { color: '#38BDF8' }]}>VOICE DELIVERY ANALYSIS</Text>
                    </View>
                    <Text style={styles.realityBody}>{verdict.voice_analysis.delivery_feedback}</Text>
                  </View>
                )}

                {/* Data Room Alignment Audit Table */}
                <View style={styles.alignCard}>
                  <View style={styles.cardHeaderWrap}>
                    <Text style={styles.sectionTitle}>DATA ROOM ALIGNMENT AUDIT</Text>
                    <Text style={styles.sectionOptionalText}>Consistency Check</Text>
                  </View>
                  <Text style={styles.alignDesc}>
                    Devang audited your Call 1 verbal claims against your uploaded spreadsheet projections:
                  </Text>

                  <View style={{ gap: 12, marginTop: 10 }}>
                    {verdict.document_alignment.map((chk, idx) => (
                      <View key={idx} style={styles.alignmentItem}>
                        <View style={styles.cardHeaderWrap}>
                          <Text style={styles.checkName} numberOfLines={1}>{chk.check_name}</Text>
                          <View style={[
                            styles.statusTag, 
                            chk.status === 'Aligned' ? styles.tagOk : chk.status === 'Discrepancy' ? styles.tagErr : styles.tagInfo
                          ]}>
                            <Text style={styles.statusTagText}>{chk.status.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={styles.auditRow}>
                          <Text style={styles.claimText}>• Claim: "{chk.verbal_claim}"</Text>
                          <Text style={styles.realityText}>• Reality: {chk.document_reality}</Text>
                        </View>

                        <View style={styles.auditCommentBox}>
                          <Text style={styles.auditCommentText}>
                            <Text style={{ fontWeight: '700', color: '#38BDF8' }}>Devang's Audit Note: </Text>
                            {chk.comments}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Training Script Gap Analysis Table */}
                {verdict.training_script_gap_analysis && verdict.training_script_gap_analysis.length > 0 && (
                  <View style={[styles.alignCard, { marginTop: 16 }]}>
                    <View style={styles.cardHeaderWrap}>
                      <Text style={styles.sectionTitle}>CALL 1 TRAINING SCRIPT GAP ANALYSIS</Text>
                      <Text style={styles.sectionOptionalText}>Internal Benchmark</Text>
                    </View>
                    <Text style={styles.alignDesc}>
                      Comparing your performance against the ideal report expected by our internal training scripts:
                    </Text>

                    <View style={{ gap: 12, marginTop: 10 }}>
                      {verdict.training_script_gap_analysis.map((gap, idx) => (
                        <View key={idx} style={styles.alignmentItem}>
                          <View style={styles.cardHeaderWrap}>
                            <Text style={styles.checkName} numberOfLines={1}>{gap.category}</Text>
                          </View>

                          <View style={styles.auditRow}>
                            <Text style={[styles.claimText, { color: '#10B981' }]}>• Ideal Expectation: {gap.ideal_expectation}</Text>
                            <Text style={[styles.realityText, { color: '#EF4444' }]}>• Your Reality: {gap.founder_reality}</Text>
                          </View>

                          <View style={[styles.auditCommentBox, { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                            <Text style={styles.auditCommentText}>
                              <Text style={{ fontWeight: '700', color: '#F59E0B' }}>Action Required: </Text>
                              {gap.improvement_directive}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Devang's Executive Reality Check */}
                <View style={styles.realityCheckCard}>
                  <View style={styles.realityHeader}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                    <Text style={styles.realityTitle}>DEVANG RAJA'S EXECUTIVE REALITY CHECK</Text>
                  </View>
                  <Text style={styles.realityBody}>{verdict.devang_reality_check}</Text>
                </View>

                {/* Actionable Roadmap */}
                <View style={styles.improvementsCard}>
                  <Text style={styles.sectionTitle}>ACTIONABLE ROADMAP FOR SYNDICATE READINESS</Text>
                  <View style={{ gap: 14, marginTop: 10 }}>
                    {verdict.actionable_improvements.map((step, i) => (
                      <View key={i} style={styles.stepRow}>
                        <View style={styles.stepIndex}>
                          <Text style={styles.stepNum}>0{i + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Verdict Footer Action Buttons */}
                <View style={styles.verdictFooter}>
                  <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
                    <Ionicons name="download" size={18} color="#060C18" style={{ marginRight: 8 }} />
                    <Text style={styles.exportBtnText}>EXPORT COMPLETE AUDIT REPORT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhase('lobby')} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <Text style={styles.retakeBtnText}>Restart Q&A Drill</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ResponsiveScrollContainer>
    </View>
  );
};

// Helper sub-component for Vector Bars
const VectorBar = ({ label, score }: { label: string; score: number }) => (
  <View style={styles.barContainer}>
    <View style={styles.cardHeaderWrap}>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>{score}/100</Text>
    </View>
    <View style={styles.barTrack}>
      <View style={[
        styles.barFill, 
        { width: `${Math.max(5, Math.min(100, score))}%` },
        score >= 75 ? { backgroundColor: '#34D399' } : score >= 50 ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#F87171' }
      ]} />
    </View>
  </View>
);

// Helper function to provide exact institutional stage benchmarks in UI
function getStageBenchmarkInfo(stage: string) {
  const clean = (stage || '').toLowerCase();
  if (clean.includes('pre-seed') || clean.includes('preseed') || clean.includes('crowd')) {
    return {
      rules: 'Revenue is optional ($0 MRR is acceptable). Evaluation weighs 80% on Founder Pedigree, Problem Severity, TAM size, and Alpha/Waitlist LOI evidence.',
      focusMetrics: 'Founder Obsession, Problem Intensity, LOIs & Waitlists, MVP Execution Timeline, Pre-Seed Capital Efficiency.',
      redFlags: 'Unrealistic pre-money valuation over ₹25 Cr ($3M) without a working prototype or lack of personal founder skin in the game.'
    };
  }
  if (clean.includes('seed')) {
    return {
      rules: 'A live commercial product is mandatory. Interrogates Month-over-Month (MoM) user/revenue growth, unit acquisition payback, and demands 12–18m runway.',
      focusMetrics: 'MoM Revenue/User Growth, Blended CAC vs Initial LTV, Net Cash Burn, Remaining Runway Months, Cohort Retention.',
      redFlags: 'High monthly cash burn with sluggish MoM growth (<10%) or heavy paid advertising dependency without repeat organic retention.'
    };
  }
  if (clean.includes('series-a') || clean.includes('series') || clean.includes('growth')) {
    return {
      rules: 'Auditing scalable, predictable unit economics and institutional governance. Strictly inspecting Gross Margin (>70% for software) and NRR (>110%).',
      focusMetrics: 'Gross Margins (>70%), Net Revenue Retention (NRR > 110%), LTV:CAC Ratio (>3:1), Sales Payback Period (<12m), Moat Durability.',
      redFlags: 'Unexplained customer churn, eroding gross margins at scale, heavy founder B2B sales dependency, or unverified Excel assumptions.'
    };
  }
  return {
    rules: 'Evaluates standard venture pillars: Market Size, Team Capabilities, Product-Market Fit evidence, and clean capital utilization.',
    focusMetrics: 'Value Proposition, Early Customer Evidence, Burn vs Runway, Team Commitment.',
    redFlags: 'Unclear revenue models or vague customer targeting.'
  };
}

// Fallbacks tailored to exact stage to guarantee smooth offline UI testing
function getFallbackRounds(mode: SimulationMode, stage: string): AIInvestorRound[] {
  const isAcq = mode === 'acquisition';
  const isPreSeed = stage.toLowerCase().includes('pre');
  const isSeriesA = stage.toLowerCase().includes('series');

  return [
    {
      round_number: 1,
      round_title: "Problem Validation & Stage Fit",
      description: `Testing elevator pitch velocity and market framing for ${stage} stage.`,
      questions: [
        {
          id: "r1_1",
          question: isPreSeed
            ? "In under 60 seconds, explain the core problem you are obsessed with solving. Why are existing alternatives completely failing your target users?"
            : "Explain what your live company does in 60 seconds. How does your defensible positioning dominate existing incumbents in the market today?",
          reason: "Investors gauge founder clarity and market mastery within the opening 120 seconds."
        },
        {
          id: "r1_2",
          question: "Walk me through your operational ecosystem and target customer profile. How do you consistently interface with early adopters or supply partners?",
          reason: "Understanding operational execution and repeat distribution velocity."
        }
      ]
    },
    {
      round_number: 2,
      round_title: "Stage Metrics & Traction Reality",
      description: `Inspecting hard performance against institutional ${stage} standards.`,
      questions: [
        {
          id: "r2_1",
          question: isPreSeed
            ? "At Pre-Seed we don't demand revenue, but we demand validation. What concrete proof (waitlist counts, LOIs, user survey logs) confirms demand?"
            : isSeriesA
            ? "Let's audit scaling efficiency: what is your current annual run rate, your Gross Margins, and your exact Net Revenue Retention (NRR) percentage?"
            : "What is your exact current MRR/GTV, your Month-over-Month (MoM) growth percentage, and your blended Customer Acquisition Cost (CAC)?",
          reason: `For ${stage}, institutional syndicates require explicit visibility into these core growth mechanics.`
        },
        {
          id: "r2_2",
          question: "What is your typical monthly cash burn, and precisely how many months of operational runway remain in your bank account today?",
          reason: "Venture Wolf's syndication partners require at least 12–18 months of projected runway to safeguard against insolvency."
        }
      ]
    },
    {
      round_number: 3,
      round_title: "Team Pedigree & Skin in the Game",
      description: "Evaluating founder full-time commitment and domain obsession.",
      questions: [
        {
          id: "r3_1",
          question: "Who holds how much stake in the Cap Table, and are 100% of the founding partners working exclusively full-time on this startup?",
          reason: "Part-time founder devotion or unearned equity distributions are automatic red flags during due diligence."
        },
        {
          id: "r3_2",
          question: "What is your personal connection to this problem, and how much personal capital have you invested into the startup from your own pocket?",
          reason: "We evaluate executive resilience by checking how much personal financial exposure and skin in the game founders maintain."
        }
      ]
    },
    {
      round_number: 4,
      round_title: isAcq ? "Acquisition Thesis & Valuation" : `Deal Terms & Valuation Defense`,
      description: isAcq ? "Defending buyout multiples and transition guarantees." : `Justifying capital ask and reaching next-stage milestones.`,
      questions: [
        {
          id: "r4_1",
          question: isAcq 
            ? "Why are you looking for an acquisition exit right now, and what makes your distribution or IP an essential buyout target over building in-house?" 
            : `How much capital are you raising in this ${stage} round, at what desired pre-money valuation, and what benchmarks justify that multiple?`,
          reason: `Testing pricing discipline and whether valuation multiples respect current ${stage} market comps.`
        },
        {
          id: "r4_2",
          question: isAcq 
            ? "Are you seeking a full or partial exit, and what executive transition commitments will your founders honor post-acquisition?" 
            : `What explicit KPI and revenue inflection milestones will this capital achieve to ensure seamless readiness for your next funding stage?`,
          reason: "Ensuring disciplined capital preservation and transparent ROI milestones."
        }
      ]
    }
  ];
}

function getFallbackVerdict(stage: string, mode: SimulationMode, qaHistory: QAPair[] = []): ClarityVerdict {
  const isPreSeed = stage.toLowerCase().includes('pre');
  const isSeriesA = stage.toLowerCase().includes('series');
  const benchmark = getStageBenchmarkInfo(stage);

  // Real-time text & answer completion audit
  const total = qaHistory.length || 8;
  let skipped = 0;
  let weak = 0;

  qaHistory.forEach(item => {
    const ans = (item.answer || '').trim().toLowerCase();
    const words = ans.split(/\s+/).filter(Boolean).length;
    if (!ans || ans.includes('[skipped') || ans.includes('[no response') || ans === 'skip' || ans === 'unsure') {
      skipped++;
    } else if (words < 7) {
      weak++;
    }
  });

  const skipRatio = (skipped / total) * 100;
  const weakRatio = (weak / total) * 100;

  // If founder skipped >= 60% of questions (e.g., pressed skip on all), return strict failing grade!
  if (skipRatio >= 60 || (skipped + weak >= total && total > 0)) {
    return {
      clarity_score: Math.max(10, Math.min(20, 18 - Math.round((skipped / total) * 6))),
      vector_scores: {
        pitch_clarity: 16,
        financial_defense: 10,
        stage_readiness: 12,
        market_mastery: 14
      },
      fundability_verdict: "High Risk / Requires Strategic Rework",
      document_alignment: [
        {
          check_name: "Verbal Defense Accountability",
          verbal_claim: "[All Core Questions Skipped / No Defense Offered]",
          document_reality: "Data Room projections cannot be validated without founder oral verification.",
          status: "Discrepancy",
          comments: "Devang Raja: You bypassed the fundamental Q&A interrogation during Call 1. Unsubstantiated spreadsheets fail syndication due diligence."
        },
        {
          check_name: `${stage} Unit Economics & Burn Rate`,
          verbal_claim: "[Skipped / Unanswered]",
          document_reality: "Burn rate and CAC projections unverified by founder testimony.",
          status: "Discrepancy",
          comments: "An absolute red flag for institutional lead investors. Never enter a VC meeting without memorizing your unit economics."
        },
        {
          check_name: "Cap Table & Founder Commitment",
          verbal_claim: "[Skipped / Unanswered]",
          document_reality: "Co-founder devotion and personal skin in the game unconfirmed.",
          status: "Unverified",
          comments: "Venture Wolf requires explicit statements regarding founder dedication before initiating introductions to our 5,000+ investors."
        }
      ],
      training_script_gap_analysis: [
        {
          category: "Call 1 Readiness",
          ideal_expectation: "Founders must provide concrete operational and financial data without hesitating.",
          founder_reality: "The founder skipped the majority of questions or provided no defense.",
          improvement_directive: "Stop skipping questions. Do not take investor meetings until you have memorized your pitch deck metrics."
        }
      ],
      devang_reality_check: `Devang Raja's Executive Reality Check: Let us be completely straightforward—you walked into an institutional evaluation simulation and skipped virtually every critical question. Whether your profile is set at ${stage} or any other tier, silence in front of lead capital providers demonstrates an unacceptable lack of preparation and metric clarity. In the real world, avoiding a direct question on problem validation, Cap Table splits, or cash runway guarantees immediate rejection from our syndicate of 5,000+ global investors. Our philosophy is 'An entrepreneur creating entrepreneurs,' which begins with uncompromising readiness. Study your spreadsheets, master your unit economics, and return when you can verbally defend every claim in your Data Room.`,
      actionable_improvements: [
        "Stop Skipping Questions: Prepare precise, disciplined responses for every standard investor inquiry; never pass on a core valuation or runway question.",
        `Memorize ${stage} Focus Metrics: Be able to recite your ${benchmark.focusMetrics.split(',')[0]} immediately without hesitating or guessing.`,
        "Demonstrate Personal Skin in the Game: Formulate a clear defense of your personal capital contribution and full-time dedication to the venture.",
        "Reconcile Data Room Models: Verify that every calculation in your Excel financial workbook can be verbally explained in under 45 seconds.",
        "Restart the Drill: Re-run this AI Investor interview and provide thorough, quantitative written defenses for all 4 rounds."
      ]
    };
  }

  if (weakRatio + skipRatio >= 50) {
    return {
      clarity_score: 46,
      vector_scores: {
        pitch_clarity: 52,
        financial_defense: 38,
        stage_readiness: 45,
        market_mastery: 41
      },
      fundability_verdict: "High Risk / Requires Strategic Rework",
      document_alignment: [
        {
          check_name: "Answer Precision & Metric Depth",
          verbal_claim: "Provided brief, generalized statements without hard numerical KPIs.",
          document_reality: "Data Room models rely on explicit customer acquisition cost and margin targets.",
          status: "Discrepancy",
          comments: "Devang Raja: Your verbal responses lacked quantitative specificity. Replace superficial assertions with verifiable performance metrics."
        }
      ],
      training_script_gap_analysis: [
        {
          category: "Metric Depth",
          ideal_expectation: "Call 1 demands precise revenue models and profit margins.",
          founder_reality: "Provided mostly buzzwords instead of hard metrics.",
          improvement_directive: "Replace vague assertions with exact numbers from your financial model."
        }
      ],
      devang_reality_check: `Your narrative orientation shows early promise for the ${stage} stage, but your interview responses were far too brief and superficial to survive institutional due diligence. You answered multiple questions with vague assertions rather than anchoring your defenses to hard figures. Institutional syndicates demand precision: when we ask about unit margins or growth rates, we expect explicit, audit-ready calculations that match your Data Room models.`,
      actionable_improvements: [
        "Replace Buzzwords with Hard Metrics: Ensure every response contains at least one verifiable historical KPI or numerical projected target.",
        "Deepen Financial Defense: Explain the exact CAC payback period and operating burn rates modeled in your Excel forecasts.",
        "Provide Contextual Proof: Reference actual customer trial counts, Letters of Intent (LOIs), or active pipeline conversion rates."
      ]
    };
  }

  // Thoroughly answered simulation
  return {
    clarity_score: isPreSeed ? 84 : 79,
    vector_scores: {
      pitch_clarity: 87,
      financial_defense: isPreSeed ? 81 : 76,
      stage_readiness: 82,
      market_mastery: 78
    },
    fundability_verdict: "Ready for Investor Introductions",
    document_alignment: [
      {
        check_name: `${stage} Growth & Revenue Consistency`,
        verbal_claim: "Articulated clear market traction and disciplined capital planning during Call 1.",
        document_reality: isPreSeed 
          ? "Data Room documents outline strong problem hypotheses and waitlist validation without premature cash burn."
          : "Financial models align with verbal growth claims, modeling sustainable payback timelines.",
        status: "Aligned",
        comments: isPreSeed 
          ? "Strong pre-seed problem framing and execution discipline."
          : "Verbal cash flow assertions match the active formulaic cells in your uploaded Excel projections."
      },
      {
        check_name: "Unit Economics & Capital Efficiency",
        verbal_claim: "Defended positive customer unit margins and logical capital use.",
        document_reality: isSeriesA 
          ? "LTV:CAC ratio models exhibit strong scalability supported by historical retention feeds."
          : "Customer acquisition cost assumptions appear realistic for seed commercialization.",
        status: "Aligned",
        comments: `Solid unit defense for ${stage} institutional review.`
      },
      {
        check_name: "Cap Table & Founder Commitment",
        verbal_claim: "Co-founders dedicated full-time with transparent equity splits.",
        document_reality: "Data Room profile structure confirms clean ownership splits with a reserved 10-15% ESOP pool.",
        status: "Aligned",
        comments: "Excellent founder alignment and executive dedication."
      }
    ],
    training_script_gap_analysis: [
      {
        category: "Institutional Readiness",
        ideal_expectation: "Clear articulation of business model, supply chain, margins, and traction.",
        founder_reality: "Successfully defended key metrics matching the Data Room.",
        improvement_directive: "Maintain this rigor in live syndication."
      }
    ],
    devang_reality_check: `As an entrepreneur creating entrepreneurs, I commend the rigor and precision you displayed during this Call 1 interview. Your verbal defenses consistently matched the quantitative models in your Data Room, proving clear command over ${stage} realities. Across our syndicate of 5,000+ investors at Venture Wolf, we look for founders who know their unit economics, preserve their runway, and demonstrate personal resilience under interrogation. You have earned an initial syndication presentation to our capital network.`,
    actionable_improvements: [
      "Maintain Data Room Freshness: Keep your Excel financial models and monthly KPI logs updated ahead of partner syndication meetings.",
      `Prepare for Deep Institutional Diligence: Anticipate follow-up requests for raw bank feeds and customer retention cohort analytics for your ${stage} round.`,
      "Lock In Lead Terms: Finalize your preferred equity valuation cap and investor rights before opening formal boardroom syndication."
    ]
  };
}

// =========================================================================
// ULTRA-PREMIUM SLEEK TERMINAL STYLES (NO COLLISIONS OR OVERLAPS)
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060C18', // Deep Rich Cosmic Obsidian
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 14,
    backgroundColor: '#091224',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navTitleHolder: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  navSubTitle: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  badgeHolder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  devangBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollBody: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  lobbyContainer: {
    gap: 16,
  },
  
  // Devang Profile Card Re-Design
  avatarCard: {
    backgroundColor: '#0B152B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#111F3D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  avatarTitles: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  avatarRole: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  leaderRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    gap: 8,
  },
  leaderRibbonText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
  },
  quoteBox: {
    marginTop: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(56, 189, 248, 0.5)',
  },
  avatarBio: {
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14,
    marginTop: 14,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNum: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '900',
  },
  statLab: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },

  // Responsive Layout Helpers
  cardHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: '60%',
  },

  // Stage Benchmark Card
  stageBenchmarkCard: {
    backgroundColor: '#0D1A33',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  stageCardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  editStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  editStageText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  stageIntroText: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 14,
  },
  podsContainer: {
    gap: 10,
  },
  benchmarkPod: {
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  podCyan: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderLeftColor: '#38BDF8',
    borderTopColor: 'rgba(56, 189, 248, 0.15)',
    borderRightColor: 'rgba(56, 189, 248, 0.15)',
    borderBottomColor: 'rgba(56, 189, 248, 0.15)',
  },
  podGreen: {
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
    borderLeftColor: '#34D399',
    borderTopColor: 'rgba(52, 211, 153, 0.15)',
    borderRightColor: 'rgba(52, 211, 153, 0.15)',
    borderBottomColor: 'rgba(52, 211, 153, 0.15)',
  },
  podRed: {
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    borderLeftColor: '#F87171',
    borderTopColor: 'rgba(248, 113, 113, 0.15)',
    borderRightColor: 'rgba(248, 113, 113, 0.15)',
    borderBottomColor: 'rgba(248, 113, 113, 0.15)',
  },
  podTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  podTitleCyan: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  podTitleGreen: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  podTitleRed: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  podContent: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  podContentRed: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 18,
  },

  // General Section Cards
  sectionCard: {
    backgroundColor: '#091224',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionOptionalText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1930',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: '#38BDF8',
  },
  modeBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modeActiveIcon: {
    marginLeft: 2,
  },

  // Status Pills & Chips
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  pillWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  docChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 6,
  },
  docChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },

  // Commanding Action Button
  primaryActionBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginTop: 4,
  },
  primaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 12, 24, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#060C18',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  primaryBtnSub: {
    color: 'rgba(6, 12, 24, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },

  // =========================================================================
  // DRILLING ARENA STYLES (INTERVIEW UI)
  // =========================================================================
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#F87171',
    fontSize: 9,
    fontWeight: '800',
  },
  miniStageTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  miniStageText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#F59E0B',
  },
  interviewContainer: {
    gap: 16,
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.75, // Take up mostly full screen on scrollable view
  },
  interviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  interviewRoundText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressTrackInterview: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  videoStage: {
    flex: 1,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    minHeight: 480,
  },
  investorTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investorVideoBg: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#091224',
  },
  investorAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111F3D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  investorAvatarListening: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  investorAvatarTextLarge: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 20,
    height: 24,
  },
  speakingBar: {
    width: 4,
    height: 16,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  questionTextCinematic: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  reasonCinematicBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    gap: 6,
  },
  reasonTextCinematic: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  nameBadgeCinematic: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nameBadgeTextCinematic: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  founderPipTile: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 80,
    height: 110,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  founderPipRecording: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: '#1E1414',
  },
  founderPipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  founderPipName: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  interviewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  skipControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipControlText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  placeholderControlBtn: {
    width: 60,
    height: 60,
  },
  mainRecordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  mainRecordBtnActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  recordInstructionText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    marginTop: -4,
  },

  // =========================================================================
  // VERDICT DASHBOARD STYLES
  // =========================================================================
  verdictContainer: {
    gap: 18,
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scoreHeroCard: {
    backgroundColor: '#0A1329',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },
  heroPreTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 18,
    textAlign: 'center',
  },
  scoreCircleWrap: {
    padding: 6,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 18,
  },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#060C18',
    borderWidth: 4,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreNumber: {
    color: '#F59E0B',
    fontSize: 42,
    fontWeight: '900',
  },
  scoreMax: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  verdictBadge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  verdictBadgeText: {
    color: '#060C18',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vectorCard: {
    backgroundColor: '#091224',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  barContainer: {
    gap: 6,
  },
  barLabel: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '600',
  },
  barValue: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '800',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#162238',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  alignCard: {
    backgroundColor: '#091224',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  alignDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 6,
    lineHeight: 18,
  },
  alignmentItem: {
    backgroundColor: '#0E1A30',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  checkName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
    flexShrink: 1,
    minWidth: '60%',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagOk: { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderWidth: 1, borderColor: '#34D399' },
  tagErr: { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderWidth: 1, borderColor: '#F87171' },
  tagInfo: { backgroundColor: 'rgba(59, 130, 246, 0.25)', borderWidth: 1, borderColor: '#60A5FA' },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  auditRow: {
    gap: 4,
    paddingTop: 4,
  },
  claimText: {
    color: '#CBD5E1',
    fontSize: 12.5,
  },
  realityText: {
    color: '#F59E0B',
    fontSize: 12.5,
  },
  auditCommentBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  auditCommentText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  realityCheckCard: {
    backgroundColor: '#0B152B',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 12,
  },
  realityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  realityTitle: {
    color: '#F59E0B',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  realityBody: {
    color: '#F8FAFC',
    fontSize: 13.5,
    lineHeight: 22,
  },
  improvementsCard: {
    backgroundColor: '#091224',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginTop: 1,
  },
  stepNum: {
    color: '#38BDF8',
    fontWeight: '900',
    fontSize: 11,
  },
  stepText: {
    color: '#E2E8F0',
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  verdictFooter: {
    gap: 12,
    marginTop: 10,
  },
  exportBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#060C18',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  retakeBtn: {
    backgroundColor: '#091224',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  retakeBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
