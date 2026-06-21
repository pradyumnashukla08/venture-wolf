import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { FundingStage } from '../types/schema';
import { theme } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';



// Data Types
type YearData = {
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
};

type YearOption = 'All' | 'year1' | 'year2' | 'year3' | 'year4' | 'year5';

// Removed Mock Raw Data Input

// Strict Indian Currency & Percent Formatters
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// Strict TypeScript Calculation Engine
const sumYears = (category: Record<string, YearData>): YearData => {
  const result = { year1: 0, year2: 0, year3: 0, year4: 0, year5: 0 };
  for (const line of Object.values(category)) {
    result.year1 += line.year1;
    result.year2 += line.year2;
    result.year3 += line.year3;
    result.year4 += line.year4;
    result.year5 += line.year5;
  }
  return result;
};

const subtractYears = (a: YearData, b: YearData): YearData => ({
  year1: a.year1 - b.year1,
  year2: a.year2 - b.year2,
  year3: a.year3 - b.year3,
  year4: a.year4 - b.year4,
  year5: a.year5 - b.year5,
});

const calculateMargin = (profit: YearData, rev: YearData): YearData => ({
  year1: rev.year1 ? (profit.year1 / rev.year1) * 100 : 0,
  year2: rev.year2 ? (profit.year2 / rev.year2) * 100 : 0,
  year3: rev.year3 ? (profit.year3 / rev.year3) * 100 : 0,
  year4: rev.year4 ? (profit.year4 / rev.year4) * 100 : 0,
  year5: rev.year5 ? (profit.year5 / rev.year5) * 100 : 0,
});

type RowDef = {
  id: string;
  type: 'master' | 'child' | 'summary';
  label: string;
  data: YearData;
  isExpanded?: boolean;
  onPress?: () => void;
  isPercent?: boolean;
};

export const FinancialForecastTable = ({ currentStage = 'Pre-Seed' }: { currentStage?: FundingStage }) => {
  const { evaluationResult } = useProfile();
  const [expanded, setExpanded] = useState({
    revenue: true,
    cogs: false,
    opex: false,
  });
  const [selectedYear, setSelectedYear] = useState<YearOption>('All');

  const rawData = evaluationResult?.financial_forecast || {
    revenue: {},
    cogs: {},
    opex: {}
  };

  const toggle = (section: keyof typeof expanded) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const yearLabels: Record<YearOption, string> = {
    All: 'All Years',
    year1: 'Year 1',
    year2: 'Year 2',
    year3: 'Year 3',
    year4: 'Year 4',
    year5: 'Year 5',
  };

  const visibleYears = selectedYear === 'All' 
    ? (['year1', 'year2', 'year3', 'year4', 'year5'] as const)
    : ([selectedYear] as const);

  const rows = useMemo(() => {
    const totalRev = sumYears(rawData.revenue);
    const totalCogs = sumYears(rawData.cogs);
    const grossProfit = subtractYears(totalRev, totalCogs);
    const grossMargin = calculateMargin(grossProfit, totalRev);
    const totalOpex = sumYears(rawData.opex);
    const ebitda = subtractYears(grossProfit, totalOpex);
    const ebitdaMargin = calculateMargin(ebitda, totalRev);

    const result: RowDef[] = [];

    const isEarlyStage = currentStage === 'Pre-Seed';

    result.push({ id: 'rev', type: 'master', label: 'Total Revenue', data: totalRev, isExpanded: expanded.revenue, onPress: () => toggle('revenue') });
    if (expanded.revenue && rawData.revenue) {
      Object.entries(rawData.revenue).forEach(([k, v]: [string, any]) => result.push({ id: `rev_${k}`, type: 'child', label: k, data: v }));
    }

    result.push({ id: 'cogs', type: 'master', label: 'Total COGS', data: totalCogs, isExpanded: expanded.cogs, onPress: () => toggle('cogs') });
    if (expanded.cogs && rawData.cogs) {
      Object.entries(rawData.cogs).forEach(([k, v]: [string, any]) => result.push({ id: `cogs_${k}`, type: 'child', label: k, data: v }));
    }

    result.push({ id: 'gp', type: 'summary', label: 'Gross Profit', data: grossProfit });
    if (!isEarlyStage) {
      result.push({ id: 'gm', type: 'summary', label: 'Gross Margin %', data: grossMargin, isPercent: true });
    }

    result.push({ id: 'opex', type: 'master', label: isEarlyStage ? 'Total Burn (Opex)' : 'Total Opex', data: totalOpex, isExpanded: expanded.opex, onPress: () => toggle('opex') });
    if (expanded.opex && rawData.opex) {
      Object.entries(rawData.opex).forEach(([k, v]: [string, any]) => result.push({ id: `opex_${k}`, type: 'child', label: k, data: v }));
    }

    if (!isEarlyStage) {
      result.push({ id: 'ebitda', type: 'summary', label: 'EBITDA', data: ebitda });
      result.push({ id: 'em', type: 'summary', label: 'EBITDA Margin %', data: ebitdaMargin, isPercent: true });
      result.push({ id: 'np', type: 'summary', label: 'Net Profit', data: ebitda });
    }

    return result;
  }, [expanded, currentStage]);

  return (
    <View style={styles.wrapper}>
      {/* Year Selector */}
      <View style={styles.yearSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearSelectorScroll}>
          {(Object.keys(yearLabels) as YearOption[]).map(key => (
            <TouchableOpacity 
              key={key} 
              onPress={() => setSelectedYear(key)}
              style={[styles.yearTab, selectedYear === key && styles.yearTabActive]}
            >
              <Text style={[styles.yearTabText, selectedYear === key && styles.yearTabTextActive]}>
                {yearLabels[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.container}>
        {/* Frozen Left Column */}
        <View style={styles.frozenColumn}>
          <View style={styles.headerCellLeft}>
            <Text style={styles.headerText}>METRICS</Text>
          </View>
          {rows.map((row) => {
            const isMaster = row.type === 'master' || row.type === 'summary';
            const Wrapper = row.type === 'master' ? TouchableOpacity : View;
            return (
              <Wrapper 
                key={row.id} 
                style={[styles.rowLeft, isMaster ? styles.rowMaster : styles.rowChild]}
                onPress={row.onPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowLabel, isMaster ? styles.rowLabelMaster : styles.rowLabelChild]} numberOfLines={2}>
                  {row.label} {row.type === 'master' ? (row.isExpanded ? '▼' : '▶') : ''}
                </Text>
              </Wrapper>
            );
          })}
        </View>

        {/* Scrollable Data Columns */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          scrollEnabled={selectedYear === 'All'}
          style={styles.scrollableArea}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ width: selectedYear === 'All' ? undefined : '100%' }}>
            <View style={styles.headerRowRight}>
              {visibleYears.map(yr => (
                <View key={yr} style={styles.dataCell}>
                  <Text style={styles.headerText}>{yearLabels[yr].toUpperCase()}</Text>
                </View>
              ))}
            </View>
            {rows.map((row) => {
              const isMaster = row.type === 'master' || row.type === 'summary';
              return (
                <View key={row.id} style={[styles.rowRight, isMaster ? styles.rowMaster : styles.rowChild]}>
                  {visibleYears.map((yr, idx) => {
                    const val = row.data[yr];
                    return (
                      <View key={idx} style={styles.dataCell}>
                        <Text style={[styles.dataText, isMaster ? styles.dataTextMaster : styles.dataTextChild]}>
                          {row.isPercent ? formatPercent(val) : formatCurrency(val)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  yearSelectorContainer: {
    marginBottom: 16,
  },
  yearSelectorScroll: {
    paddingHorizontal: 4,
  },
  yearTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.inner,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yearTabActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#0284C7',
  },
  yearTabText: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
    color: '#64748B',
  },
  yearTabTextActive: {
    color: '#FFFFFF',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  frozenColumn: {
    width: 150,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    zIndex: 10,
  },
  scrollableArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerCellLeft: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerRowRight: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  rowLeft: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowRight: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowMaster: {
    height: 54,
    backgroundColor: '#F1F5F9',
  },
  rowChild: {
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  dataCell: {
    width: 140, // Keeps columns uniformly aligned and cleanly sized without stretching to screen width
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowLabelMaster: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  rowLabelChild: {
    fontWeight: '600',
    color: '#64748B',
    fontSize: 12,
  },
  dataText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  dataTextMaster: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  dataTextChild: {
    fontWeight: '400',
    color: '#64748B',
    fontSize: 13,
  },
});
