import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { theme } from '../constants/theme';

export const FunnelPipelineScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.pageTitle}>My Pipeline</Text>
      </View>

      <View style={styles.stagesRow}>
        <View style={styles.stageItem}>
          <Text style={styles.stageTitle}>Interested</Text>
          <Text style={styles.stageCount}>8</Text>
        </View>
        <View style={styles.stageItem}>
          <Text style={styles.stageTitle}>Meeting</Text>
          <Text style={styles.stageCount}>4</Text>
        </View>
        <View style={styles.stageItem}>
          <Text style={styles.stageTitle}>DD</Text>
          <Text style={styles.stageCount}>3</Text>
        </View>
        <View style={styles.stageItem}>
          <Text style={styles.stageTitle}>Term Sheet</Text>
          <Text style={styles.stageCount}>1</Text>
        </View>
        <View style={styles.stageItem}>
          <Text style={styles.stageTitle}>Invested</Text>
          <Text style={styles.stageCount}>2</Text>
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {/* Meeting Card */}
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: theme.colors.primary }]}>
            <Text style={styles.iconText}>📅</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.startupName}>AvasPlot</Text>
            <Text style={[styles.stageSub, { color: theme.colors.primary }]}>Meeting Scheduled</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusDetail}>Tomorrow 4:00 PM</Text>
          </View>
        </View>

        {/* DD Card */}
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(250, 204, 21, 0.1)', borderColor: theme.colors.secondary }]}>
            <Text style={styles.iconText}>🔍</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.startupName}>FinEdge</Text>
            <Text style={[styles.stageSub, { color: theme.colors.secondary }]}>Due Diligence</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusDetail}>In Progress</Text>
          </View>
        </View>

        {/* Term Sheet Card */}
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981' }]}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.startupName}>GreenGrid</Text>
            <Text style={[styles.stageSub, { color: '#10B981' }]}>Term Sheet</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusDetail}>Shared</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  headerBlock: {
    padding: 24,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.darkText,
  },
  stagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  stageItem: {
    alignItems: 'center',
  },
  stageTitle: {
    fontSize: 10,
    color: theme.colors.darkTextMuted,
    marginBottom: 8,
  },
  stageCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.darkText,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkSurface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  iconText: {
    fontSize: 18,
  },
  infoBox: {
    flex: 1,
  },
  startupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 4,
  },
  stageSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBox: {
    alignItems: 'flex-end',
  },
  statusDetail: {
    fontSize: 12,
    color: theme.colors.darkTextMuted,
  },
});
