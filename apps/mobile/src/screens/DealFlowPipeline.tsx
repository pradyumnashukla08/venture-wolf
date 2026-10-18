import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';

const startups = [
  { id: '1', name: 'AvasPlot', detail: 'Seed • B2B SaaS', score: '13 Cr', logo: 'XV', starred: true },
  { id: '2', name: 'FinEdge', detail: 'Seed • Fintech', score: '₹2 Cr', logo: '7E', starred: false },
  { id: '3', name: 'GreenGrid', detail: 'Pre-Seed • Climate Tech', score: '₹75 L', logo: 'G', starred: true },
  { id: '4', name: 'Kalaa', detail: 'Seed • Consumer', score: '₹1 Cr', logo: 'K', starred: false },
];

export const DealFlowPipeline = ({ navigation }: any) => {
  const { isTabletOrFold: isTablet, halfWidth } = useResponsiveLayout();

  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.pageTitle}>Deal Flow</Text>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity activeOpacity={0.7} style={[styles.filterChip, theme.borders.premiumDark]}>
          <Text style={styles.filterText}>ALL STAGES ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={[styles.filterChip, theme.borders.premiumDark]}>
          <Text style={styles.filterText}>ALL SECTORS ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={[styles.filterChip, theme.borders.premiumDark]}>
          <Text style={styles.filterText}>SORT ▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {startups.map((startup) => (
          <TouchableOpacity activeOpacity={0.8} key={startup.id} style={[styles.card, theme.borders.premiumDark, { width: isTablet ? halfWidth : '100%' }]} onPress={() => navigation.navigate('InvestorDetail', { startupId: startup.id })}>
            <View style={[styles.logoBox, theme.borders.premiumDark]}>
              <Text style={styles.logoText}>{startup.logo}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.startupName}>{startup.name}</Text>
              <Text style={styles.startupDetail}>{startup.detail}</Text>
            </View>
            <View style={styles.actionBox}>
              <Text style={styles.scoreText}>{startup.score}</Text>
              <Text style={startup.starred ? styles.starActive : styles.starInactive}>★</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkBackground,
  },
  content: {
    paddingBottom: 40,
  },
  headerBlock: {
    padding: 24,
    paddingTop: 40,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: -0.5,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  filterChip: {
    backgroundColor: theme.colors.darkSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.inner,
  },
  filterText: {
    color: theme.colors.darkText,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkSurface,
    padding: 16,
    borderRadius: theme.borderRadius.card,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.inner,
    backgroundColor: theme.colors.darkBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoText: {
    color: theme.colors.darkText,
    fontWeight: '900',
    fontSize: 18,
  },
  infoBox: {
    flex: 1,
  },
  startupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.darkText,
    marginBottom: 4,
  },
  startupDetail: {
    fontSize: 12,
    color: theme.colors.darkTextMuted,
    letterSpacing: 0.5,
  },
  actionBox: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.darkText,
    letterSpacing: -0.5,
  },
  starActive: {
    color: theme.colors.secondary, // Gold star
    fontSize: 22,
  },
  starInactive: {
    color: theme.colors.darkTextMuted,
    fontSize: 22,
  },
});
