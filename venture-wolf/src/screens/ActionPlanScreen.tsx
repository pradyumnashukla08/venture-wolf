import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, useWindowDimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useProfileStore } from '../store/useProfileStore';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { generateActionSteps, ActionStep } from '../utils/remediationMapper';

export const ActionPlanScreen = ({ navigation }: any) => {
  const { evaluationResult } = useProfileStore();
  const [tasks, setTasks] = useState<ActionStep[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (evaluationResult?.red_flags && Array.isArray(evaluationResult.red_flags)) {
      setTasks(generateActionSteps(evaluationResult.red_flags));
    }
  }, [evaluationResult]);

  const toggleTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isComplete: !t.isComplete } : t));
  };

  if (!evaluationResult || !evaluationResult.red_flags || !Array.isArray(evaluationResult.red_flags)) {
    return (
      <View style={[styles.wrapper, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
        <Ionicons name="document-lock-outline" size={64} color="#334155" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>AI is still processing your data...</Text>
        <Text style={styles.emptySub}>We are mapping your risk vectors into actionable milestones. Please run an evaluation or wait.</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.navigate('ImportCenter')}>
          <Text style={styles.fallbackButtonText}>Go to Data Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedCount = tasks.filter(t => t.isComplete).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;
  const is100Percent = totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    if (is100Percent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [is100Percent]);

  const renderHeader = () => (
    <>
      {/* Header section */}
      <View style={styles.headerBlock}>
        <View style={styles.iconGlow}>
          <Ionicons name="shield-checkmark" size={32} color="#10B981" />
        </View>
        <Text style={styles.pageTitle}>Fundability Action Plan</Text>
        <Text style={styles.pageSubtitle}>The AI has mapped your risk vectors into actionable milestones. Clear the board to re-evaluate.</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Remediation Progress</Text>
          <Text style={styles.progressCount}>{completedCount} / {totalCount} Tasks</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </>
  );

  const getIconForType = (type: string) => {
    if (type === 'financial') return 'cash-outline';
    if (type === 'product') return 'cube-outline';
    if (type === 'team') return 'people-outline';
    return 'globe-outline'; // market
  };

  const TaskCard = React.memo(({ task, onToggle }: { task: ActionStep, onToggle: (id: string) => void }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      style={[styles.taskCard, task.isComplete && styles.taskCardComplete]}
      onPress={() => onToggle(task.id)}
    >
      <View style={styles.taskCardHeader}>
        <View style={styles.taskIconBox}>
          <Ionicons name={getIconForType(task.type)} size={20} color={task.isComplete ? '#10B981' : '#E2E8F0'} />
        </View>
        <Text style={[styles.taskTitle, task.isComplete && styles.textDimmed]}>{task.title}</Text>
        
        <View style={[styles.checkbox, task.isComplete && styles.checkboxActive]}>
          {task.isComplete && <Ionicons name="checkmark" size={16} color="#0B0F19" />}
        </View>
      </View>
      <Text style={[styles.taskDesc, task.isComplete && styles.textDimmed]}>{task.task}</Text>
    </TouchableOpacity>
  ));

  const renderItem = React.useCallback(({ item: task }: { item: ActionStep }) => {
    return <TaskCard task={task} onToggle={toggleTask} />;
  }, [toggleTask]);

  return (
    <View style={styles.wrapper}>
      <ResponsiveContainer>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
        />
      </ResponsiveContainer>

      {/* Bottom Sticky Action */}
      <View style={styles.bottomBar}>
        <Animated.View style={{ transform: [{ scale: is100Percent ? pulseAnim : 1 }] }}>
          <TouchableOpacity 
            style={[styles.primaryButton, is100Percent ? styles.primaryButtonGlowing : { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]} 
            activeOpacity={0.8}
            onPress={() => is100Percent ? navigation.navigate('ImportCenter') : navigation.popToTop()}
          >
            <View style={styles.buttonInner}>
              <Ionicons name={is100Percent ? "refresh-circle" : "home"} size={24} color={is100Percent ? '#0B0F19' : '#E2E8F0'} style={{ marginRight: 8 }} />
              <Text style={[styles.primaryButtonText, is100Percent ? styles.buttonTextGlowing : { color: '#F8FAFC' }]}>
                {is100Percent ? 'RUN AI RE-EVALUATION' : 'RETURN TO HOME'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0B0F19' },
  container: { padding: 24, paddingBottom: 140 },
  
  headerBlock: { marginBottom: 32, alignItems: 'center', marginTop: 32 },
  iconGlow: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22, maxWidth: 400 },

  progressContainer: { marginBottom: 32 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { color: '#E2E8F0', fontSize: 14, fontWeight: 'bold' },
  progressCount: { color: '#10B981', fontSize: 14, fontWeight: '900' },
  progressTrack: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },

  taskList: { gap: 16 },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  taskCardComplete: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  taskDesc: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  
  textDimmed: { opacity: 0.4 },

  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#64748B', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(11, 15, 25, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  primaryButton: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  primaryButtonGlowing: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center' },
  primaryButtonText: { color: '#64748B', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  buttonTextGlowing: { color: '#0B0F19' },

  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#94A3B8', marginBottom: 24, textAlign: 'center' },
  fallbackButton: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  fallbackButtonText: { color: '#0B0F19', fontWeight: 'bold' }
});
