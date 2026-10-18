import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { GuardrailCorrection, ValuationAudit } from '../screens/Finance/types';

/**
 * What the founder is entitled to know about their own forecast.
 *
 * Three things the backend now works out and the app previously had no way to
 * show, in the order a founder needs them:
 *
 * 1.  **Every figure here is assumed.** The whole model is built from drivers a
 *     language model proposed, including the valuation. Until this component
 *     existed, those numbers arrived in the app looking exactly like measured
 *     data, and then went into an institutional-looking spreadsheet.
 *
 * 2.  **Where the system overruled the model.** The India guardrails hold the
 *     proposed drivers to statutory and market limits. A correction is shown
 *     rather than applied silently: a founder who sees that their churn was
 *     raised to the 2% floor learns something real about their own model.
 *
 * 3.  **Whether the valuation is supported by anything.** The proposed
 *     valuation is audited against methods that can actually be run, and the
 *     honest answer today is usually that not enough inputs exist to check it.
 *     Saying so is the point.
 *
 * Every prop is optional, because a result cached before this shipped will not
 * carry any of it. Absent means absent, and the section simply does not render.
 */
export interface ForecastProvenanceProps {
  disclosure?: string | undefined;
  corrections?: GuardrailCorrection[] | undefined;
  valuationAudit?: ValuationAudit | undefined;
}

function formatDriver(driver: string): string {
  return driver
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}

/** Drivers are rates, days or money; showing a rate as "0.02" helps nobody. */
function formatValue(driver: string, value: number): string {
  if (/days$/i.test(driver)) return `${value} days`;
  if (value > 0 && value < 1) return `${(value * 100).toFixed(2)}%`;
  return value.toLocaleString('en-IN');
}

export const ForecastProvenance: React.FC<ForecastProvenanceProps> = ({
  disclosure,
  corrections,
  valuationAudit,
}) => {
  const hasCorrections = corrections !== undefined && corrections.length > 0;

  if (!disclosure && !hasCorrections && !valuationAudit) return null;

  return (
    <View style={styles.wrapper}>
      {disclosure ? (
        <View style={[styles.card, styles.disclosureCard]}>
          <View style={styles.header}>
            <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
            <Text style={[styles.headerText, styles.disclosureHeaderText]}>
              These are assumptions, not measurements
            </Text>
          </View>
          <Text style={styles.body}>{disclosure}</Text>
        </View>
      ) : null}

      {hasCorrections ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#38BDF8" />
            <Text style={styles.headerText}>
              {corrections.length === 1
                ? '1 driver corrected to India guardrails'
                : `${corrections.length} drivers corrected to India guardrails`}
            </Text>
          </View>

          {corrections.map((correction, index) => (
            <View
              key={`${correction.scenario}-${correction.driver}-${index}`}
              style={styles.correction}
            >
              <Text style={styles.correctionTitle}>
                {correction.scenario} case &middot; {formatDriver(correction.driver)}
              </Text>
              <Text style={styles.correctionChange}>
                {formatValue(correction.driver, correction.proposed)}
                {'  →  '}
                {formatValue(correction.driver, correction.corrected)}
              </Text>
              <Text style={styles.correctionReason}>{correction.because}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {valuationAudit ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons
              name={valuationAudit.supported ? 'checkmark-circle-outline' : 'help-circle-outline'}
              size={16}
              color={valuationAudit.supported ? '#34D399' : '#F59E0B'}
            />
            <Text style={styles.headerText}>
              {valuationAudit.supported
                ? 'Valuation supported by the methods run'
                : 'Valuation not yet supported by any method'}
            </Text>
          </View>

          <Text style={styles.body}>{valuationAudit.comment}</Text>

          {valuationAudit.missingInputs.length > 0 ? (
            <View style={styles.missingBlock}>
              <Text style={styles.missingTitle}>To value this properly, we still need:</Text>
              {valuationAudit.missingInputs.map((missing) => (
                <Text key={missing.method} style={styles.missingItem}>
                  &bull; {missing.method}
                  {missing.needs.length > 0 ? ` — ${missing.needs.join(', ')}` : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  disclosureCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  disclosureHeaderText: {
    color: '#FCD34D',
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
  },
  correction: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
    marginTop: 10,
  },
  correctionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  correctionChange: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 2,
  },
  correctionReason: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  missingBlock: {
    marginTop: 10,
  },
  missingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 4,
  },
  missingItem: {
    fontSize: 11,
    lineHeight: 17,
    color: '#94A3B8',
  },
});
