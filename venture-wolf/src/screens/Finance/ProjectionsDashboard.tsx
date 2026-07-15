import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { ProjectionsData } from './types';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface ProjectionsDashboardProps {
  projections: ProjectionsData;
  assumptions?: Record<string, any>;
  downloadUrl: string;
  highRiskOfRuin?: boolean;
  onReset: () => void;
}

type Scenario = 'worstCase' | 'baseCase' | 'bestCase';

const formatCurrency = (value: number) => {
  // Simple Indian Rupee formatting helper
  if (isNaN(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number) => {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
};

export const ProjectionsDashboard: React.FC<ProjectionsDashboardProps> = ({ projections, assumptions, downloadUrl, highRiskOfRuin, onReset }) => {
  const [activeScenario, setActiveScenario] = useState<Scenario>('baseCase');

  const handleDownload = async () => {
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Error', 'Cannot open the provided download link.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while trying to download the file.');
    }
  };

  const renderScenarioToggle = (scenarioKey: Scenario, label: string) => {
    const isActive = activeScenario === scenarioKey;
    return (
      <TouchableOpacity 
        style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
        onPress={() => setActiveScenario(scenarioKey)}
        key={scenarioKey}
      >
        <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const activeData = projections[activeScenario];
  const displayMetrics = [
    '1. Total Revenue',
    'A. Gross Margin %',
    '5. EBITDA',
    'B. EBITDA %',
    '11. PAT',
    'C. PAT %'
  ];

  const aiKey = activeScenario === 'worstCase' ? 'Worst' : activeScenario === 'baseCase' ? 'Base' : 'Best';
  const currentAssumptions = assumptions ? assumptions[aiKey] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onReset}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Projections</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.segmentContainer}>
        {renderScenarioToggle('worstCase', 'WORST')}
        {renderScenarioToggle('baseCase', 'BASE')}
        {renderScenarioToggle('bestCase', 'BEST')}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        
        {/* New Funding Reality Highlight Box */}
        {highRiskOfRuin && activeScenario === 'worstCase' && (
          <View style={[styles.realityBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <View style={styles.realityHeader}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={[styles.realityTitle, { color: '#EF4444', fontSize: 16 }]}>SEVERE RUNWAY RISK</Text>
            </View>
            <Text style={{ color: '#F8FAFC', fontSize: 13, lineHeight: 20, fontWeight: '600' }}>
              The model projects complete cash exhaustion by Year 2 under the Worst Case scenario. Your current unit economics and overhead burden cannot survive severe market friction.
            </Text>
          </View>
        )}

        {currentAssumptions && (
          <View style={styles.realityBox}>
            <View style={styles.realityHeader}>
              <Ionicons name="flash" size={16} color="#F59E0B" />
              <Text style={styles.realityTitle}>Funding Reality Check</Text>
            </View>
            <View style={styles.realityMetricsRow}>
              <View style={styles.realityMetric}>
                <Text style={styles.realityLabel}>Est. Valuation (Post-Money)</Text>
                <Text style={styles.realityValue}>{formatCurrency(currentAssumptions.estimatedValuation)}</Text>
              </View>
              <View style={styles.realityMetric}>
                <Text style={styles.realityLabel}>Equity Dilution</Text>
                <Text style={[styles.realityValue, { color: '#EF4444' }]}>
                  {formatPercentage(currentAssumptions.equityDilutionPct)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          {/* Header Row */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.metricNameCell, styles.headerCell]}>Metric</Text>
            <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Yr 1</Text>
            <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Yr 3</Text>
            <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Yr 5</Text>
          </View>

          {/* Data Rows */}
          {displayMetrics.map((metricKey, index) => {
            const dataRow = activeData[metricKey];
            if (!dataRow) return null;
            
            const isPercent = metricKey.includes('%');
            const formatFn = isPercent ? formatPercentage : formatCurrency;

            return (
              <View key={metricKey} style={[styles.row, index % 2 === 1 && styles.altRow]}>
                <Text style={[styles.cell, styles.metricNameCell]} numberOfLines={1}>{metricKey.split('. ')[1] || metricKey}</Text>
                <Text style={[styles.cell, styles.dataCell]}>{formatFn(dataRow[0])}</Text>
                <Text style={[styles.cell, styles.dataCell]}>{formatFn(dataRow[2])}</Text>
                <Text style={[styles.cell, styles.dataCell, styles.highlightCell]}>{formatFn(dataRow[4])}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Ionicons name="download-outline" size={20} color="#0F172A" style={{ marginRight: 8 }} />
          <Text style={styles.downloadButtonText}>Download Full Excel Model</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.darkText,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.inner,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    alignItems: 'center',
    backgroundColor: theme.colors.darkBackground,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.darkTextMuted,
  },
  segmentTextActive: {
    color: '#0F172A',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  realityBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16,
    marginBottom: 24,
  },
  realityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  realityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  realityMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  realityMetric: {
    flex: 1,
  },
  realityLabel: {
    fontSize: 11,
    color: theme.colors.darkTextMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  realityValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.darkText,
  },
  card: {
    backgroundColor: theme.colors.darkSurface,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkBorder,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  altRow: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerRow: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)', // Light primary tint
    borderBottomWidth: 2,
  },
  cell: {
    fontSize: 13,
    color: theme.colors.darkText,
  },
  headerCell: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  metricNameCell: {
    flex: 2,
    fontWeight: '600',
  },
  dataCell: {
    flex: 1,
    textAlign: 'right',
  },
  highlightCell: {
    fontWeight: 'bold',
    color: theme.colors.secondary, // Gold for year 5 projection
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkBorder,
    backgroundColor: theme.colors.darkBackground,
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
