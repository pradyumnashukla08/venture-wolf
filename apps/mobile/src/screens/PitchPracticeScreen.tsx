// Forces IDE cache refresh
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';
import { useProfileStore } from '../store/useProfileStore';
import { EcosystemEmptyState } from '../components/EcosystemEmptyState';
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
import { API_BASE_URL } from '../config/api';
import { decode } from 'base64-arraybuffer';
import { ActivityIndicator, Alert } from 'react-native';

export const PitchPracticeScreen = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, thirdWidth } = useResponsiveLayout();
  const { evaluationResult, processedDocIds } = useProfileStore();
  
  const hasRequiredDocs = processedDocIds.includes('pitch_deck');
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recording, setRecording] = useState<any | null>(null);
  const [sound, setSound] = useState<any | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(10)).current;
  const waveAnim2 = useRef(new Animated.Value(20)).current;
  const waveAnim3 = useRef(new Animated.Value(15)).current;
  const waveAnim4 = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    if (isRecording || isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();

      const animateWave = (anim: Animated.Value, min: number, max: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: max, duration: Math.random() * 300 + 200, useNativeDriver: false }),
            Animated.timing(anim, { toValue: min, duration: Math.random() * 300 + 200, useNativeDriver: false })
          ])
        ).start();
      };
      animateWave(waveAnim1, 10, 60);
      animateWave(waveAnim2, 20, 80);
      animateWave(waveAnim3, 15, 50);
      animateWave(waveAnim4, 25, 90);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      waveAnim1.stopAnimation(); waveAnim1.setValue(10);
      waveAnim2.stopAnimation(); waveAnim2.setValue(20);
      waveAnim3.stopAnimation(); waveAnim3.setValue(15);
      waveAnim4.stopAnimation(); waveAnim4.setValue(25);
    }
  }, [isRecording, isPlaying]);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
      setRecording(recording);
      setIsRecording(true);
      setHasRecorded(false);
      setRecordingUri(null);
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    setHasRecorded(true);
    
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        try {
          let dir = FileSystem.documentDirectory || '';
          if (dir && !dir.endsWith('/')) dir += '/';
          const fileName = `pitch_recording_${Date.now()}.m4a`;
          const newUri = dir + fileName;
          await FileSystem.copyAsync({
            from: uri,
            to: newUri
          });
          setRecordingUri(newUri);
        } catch (err) {
          console.error("Failed to save to document dir, using cache uri", err);
          setRecordingUri(uri);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  async function togglePlayback() {
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else if (recordingUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              // Reset sound position to beginning so it can be played again
              newSound.setPositionAsync(0);
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    }
  }

  async function deleteRecording() {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setRecording(null);
    setRecordingUri(null);
    setHasRecorded(false);
    setIsPlaying(false);
    setAnalysisResult(null);
  }

  async function analyzePitch() {
    if (!recordingUri) return;
    setIsAnalyzing(true);
    try {
      const base64Audio = await FileSystem.readAsStringAsync(recordingUri, { encoding: FileSystem.EncodingType.Base64 });
      const arrayBuffer = decode(base64Audio);
      
      const userId = auth.currentUser?.uid || 'unknown';
      const fileName = `pitches/${userId}/${Date.now()}.m4a`;
      
      const fileRef = ref(storage, `data_room/${fileName}`);
      await uploadBytes(fileRef, arrayBuffer, { contentType: 'audio/m4a' });

      const currentUser = auth.currentUser;
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/evaluate/pitch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ audioPath: fileName })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to analyze pitch');

      setAnalysisResult(json.analysis.evaluation);
    } catch (err: any) {
      console.error('Analyze pitch error:', err);
      Alert.alert('Analysis Failed', err.message || 'There was an issue processing your pitch.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!evaluationResult || !hasRequiredDocs) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.topNavRow, { padding: 24, paddingTop: 48, paddingBottom: 0, backgroundColor: '#F8FAFC' }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <EcosystemEmptyState 
          featureName="Pitch Practice" 
          requiredDocument="Pitch Deck" 
          iconName="mic-outline" 
        />
      </View>
    );
  }

  return (
    <View style={styles.darkEnvironment}>
      <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Top Nav */}
        <View style={styles.topNavRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Executive Pitch Studio</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Audio Interface */}
        <View style={styles.studioContainer}>
          <View style={styles.waveformBox}>
            {isRecording || isPlaying ? (
              <View style={styles.waveRow}>
                <Animated.View style={[styles.waveBar, { height: waveAnim1 }]} />
                <Animated.View style={[styles.waveBar, { height: waveAnim2 }]} />
                <Animated.View style={[styles.waveBar, { height: waveAnim3 }]} />
                <Animated.View style={[styles.waveBar, { height: waveAnim4 }]} />
                <Animated.View style={[styles.waveBar, { height: waveAnim2 }]} />
                <Animated.View style={[styles.waveBar, { height: waveAnim1 }]} />
              </View>
            ) : (
              <View style={styles.idleWave}>
                <Ionicons name="mic-outline" size={48} color="#38BDF8" />
                <Text style={styles.idleText}>Ready for your 60-second pitch.</Text>
              </View>
            )}
          </View>

          <View style={styles.captureArray}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: (isRecording || isPlaying) ? 0.3 : 0 }]} />
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.recordButton, isRecording && { backgroundColor: '#EF4444' }]} 
              onPress={toggleRecording}
            >
              <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.recordStatus}>{isRecording ? 'RECORDING... TAP TO STOP' : 'START RECORDING'}</Text>
          </View>

          {/* Playback Button */}
          {hasRecorded && recordingUri && !isRecording && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 36, alignItems: 'center' }}>
              <TouchableOpacity 
                style={[styles.playbackButton, { marginTop: 0 }]} 
                onPress={togglePlayback}
                activeOpacity={0.8}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
                <Text style={styles.playbackButtonText}>{isPlaying ? "PAUSE" : "LISTEN"}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.playbackButton, { marginTop: 0, backgroundColor: '#EF4444' }]} 
                onPress={deleteRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.playbackButtonText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {hasRecorded && recordingUri && !isRecording && !analysisResult && (
            <TouchableOpacity 
              style={[styles.playbackButton, { marginTop: 16, backgroundColor: '#10B981', width: 220, justifyContent: 'center' }]} 
              onPress={analyzePitch}
              disabled={isAnalyzing}
              activeOpacity={0.8}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.playbackButtonText}>ANALYZE WITH AI</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Output Metrics */}
        {hasRecorded && analysisResult && (
          <View style={styles.metricsOutput}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreTitle}>PERSUASION SCORE</Text>
              <Text style={styles.scoreValue}>{analysisResult.persuasion_score || 0}<Text style={styles.scoreBase}>/100</Text></Text>
            </View>

            <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', gap: 16 }}>
              {/* Card 1 */}
              <View style={[styles.feedbackCard, { width: thirdWidth }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="speedometer-outline" size={20} color="#38BDF8" />
                  <Text style={styles.cardLabel}>PACING & TONE</Text>
                </View>
                <Text style={styles.cardText}>{analysisResult.pacing_and_tone || "Processing..."}</Text>
              </View>

              {/* Card 2 */}
              <View style={[styles.feedbackCard, { width: thirdWidth }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="flash-outline" size={20} color="#10B981" />
                  <Text style={styles.cardLabel}>HOOK STRENGTH</Text>
                </View>
                <Text style={styles.cardText}>{analysisResult.hook_strength || "Processing..."}</Text>
              </View>

              {/* Card 3 */}
              <View style={[styles.feedbackCard, { width: thirdWidth }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                  <Text style={styles.cardLabel}>CLARITY OF ASK</Text>
                </View>
                <Text style={styles.cardText}>{analysisResult.clarity_of_ask || "Processing..."}</Text>
              </View>
            </View>
          </View>
        )}

      </ResponsiveScrollContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  darkEnvironment: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  studioContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  waveformBox: {
    height: 160,
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 32,
    overflow: 'hidden',
  },
  idleWave: {
    alignItems: 'center',
  },
  idleText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    gap: 8,
  },
  waveBar: {
    width: 12,
    backgroundColor: '#38BDF8',
    borderRadius: 6,
  },
  captureArray: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 120,
    width: 120,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#38BDF8',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10,
  },
  recordStatus: {
    position: 'absolute',
    bottom: -30,
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  playbackButton: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  playbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 8,
    letterSpacing: 1,
  },
  metricsOutput: {
    marginTop: 16,
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 72,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 80,
  },
  scoreBase: {
    fontSize: 24,
    color: '#64748B',
  },
  feedbackCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F8FAFC',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  cardText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
});
