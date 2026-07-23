import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProjectionsData } from './types';
import { theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIDisclaimer } from '../../components/AIDisclaimer';

interface DownloadHistoryItem {
  id: string;
  filename: string;
  date: string;
  uri: string;
}

interface ProjectionsDashboardProps {
  projections: ProjectionsData;
  assumptions?: Record<string, any>;
  downloadUrl: string;
  highRiskOfRuin?: boolean;
  onReset: () => void;
}

type Scenario = 'worstCase' | 'baseCase' | 'bestCase';

const formatCurrency = (value: number) => {
  if (isNaN(value)) return '₹0';
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return isNegative ? `(${formatted})` : formatted;
};

const formatPercentage = (value: number) => {
  if (isNaN(value)) return '0%';
  const isNegative = value < 0;
  const formatted = `${(Math.abs(value) * 100).toFixed(1)}%`;
  return isNegative ? `(${formatted})` : formatted;
};

export const ProjectionsDashboard: React.FC<ProjectionsDashboardProps> = ({ projections, assumptions, downloadUrl, highRiskOfRuin, onReset }) => {
  const [activeScenario, setActiveScenario] = useState<Scenario>('baseCase');
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem('@venturewolf_downloads');
        if (stored) setDownloadHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    loadHistory();
  }, []);

  const openFile = async (uri: string) => {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            UTI: 'com.microsoft.excel.xls',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Save or Open Financial Forecast',
          });
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      Alert.alert('Notice', 'No app found to open Excel files directly. Opening share menu instead...');
      // Fallback
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
    }
  };

  const handleDownload = async () => {
    try {
      const filename = `Financial_Forecast_${activeScenario}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadRes.status !== 200) {
        throw new Error('Download failed');
      }

      const newItem: DownloadHistoryItem = {
        id: Date.now().toString(),
        filename: filename,
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        uri: downloadRes.uri
      };
      const newHistory = [newItem, ...downloadHistory];
      setDownloadHistory(newHistory);
      AsyncStorage.setItem('@venturewolf_downloads', JSON.stringify(newHistory));

      await openFile(downloadRes.uri);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while downloading the file.');
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('FounderTabs')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Projections</Text>
        <TouchableOpacity style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }]} onPress={onReset}>
          <Ionicons name="refresh" size={14} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 6 }}>New</Text>
        </TouchableOpacity>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Header Row */}
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.metricNameCell, styles.headerCell]}>Metric</Text>
                <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Year 1</Text>
                <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Year 2</Text>
                <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Year 3</Text>
                <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Year 4</Text>
                <Text style={[styles.cell, styles.dataCell, styles.headerCell]}>Year 5</Text>
              </View>

              {/* Data Rows */}
              {displayMetrics.map((metricKey, index) => {
                const dataRow = activeData[metricKey];
                if (!dataRow) return null;
                
                const isPercent = metricKey.includes('%');
                const formatFn = isPercent ? formatPercentage : formatCurrency;

                const renderCell = (val: number, isLast: boolean = false) => {
                  const isNegative = val < 0;
                  return (
                    <Text style={[
                      styles.cell, 
                      styles.dataCell, 
                      isLast && styles.highlightCell,
                      isNegative && { color: '#EF4444' } // Standard red color for negative financials
                    ]}>
                      {formatFn(val)}
                    </Text>
                  );
                };

                return (
                  <View key={metricKey} style={[styles.row, index % 2 === 1 && styles.altRow]}>
                    <Text style={[styles.cell, styles.metricNameCell]} numberOfLines={1}>{metricKey.split('. ')[1] || metricKey}</Text>
                    {renderCell(dataRow[0])}
                    {renderCell(dataRow[1])}
                    {renderCell(dataRow[2])}
                    {renderCell(dataRow[3])}
                    {renderCell(dataRow[4], true)}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recent Downloads History */}
        {downloadHistory.length > 0 && (
          <View style={{ marginTop: 32, marginBottom: 24, marginHorizontal: 20, padding: 24, backgroundColor: theme.colors.darkSurface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.darkBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="document-text" size={20} color={theme.colors.darkText} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.darkText, marginLeft: 8 }}>Recent Excel Downloads</Text>
            </View>
            {downloadHistory.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.darkBorder }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.darkText, marginBottom: 6 }}>{item.filename}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.darkTextMuted }}>{item.date}</Text>
                </View>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' }}
                  onPress={() => openFile(item.uri)}
                >
                  <Ionicons name="open-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.primary }}>Open</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <AIDisclaimer />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('FounderTabs', { screen: 'Home' })}>
          <Text style={styles.returnButtonText}>Return to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }]} onPress={handleDownload}>
          <Ionicons name="download-outline" size={20} color="#0F172A" />
          <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 15, marginLeft: 8 }}>Save Excel</Text>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 20,
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
  },
  altRow: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerRow: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)', // Light primary tint
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  cell: {
    fontSize: 13,
    color: theme.colors.darkText,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: theme.colors.darkBorder,
    justifyContent: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  metricNameCell: {
    width: 140,
    fontWeight: '600',
  },
  dataCell: {
    width: 100,
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
    flexDirection: 'row',
    gap: 12,
  },
  returnButton: {
    flex: 1,
    backgroundColor: theme.colors.darkSurface,
    borderWidth: 1,
    borderColor: theme.colors.darkBorder,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnButtonText: {
    color: theme.colors.darkText,
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
