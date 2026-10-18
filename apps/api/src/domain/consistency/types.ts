/**
 * Cross-document consistency: what disagrees with what.
 *
 * Ported from WaoU-Fund's `engines/consistency`. The product specification
 * calls for a checker that "continuously scans deck, IM, model and GTM for
 * contradicting numbers", and the underlying playbook rule is blunt:
 *
 *     If the deck says Rs 100 Cr FY31 revenue, the financial model cannot say
 *     Rs 82 Cr.
 *
 * The failure this prevents is specific and common: a founder edits one
 * document, forgets the other, and walks into a meeting where an investor finds
 * the discrepancy first. Being asked "which of these two numbers is true?" is
 * expensive in a way that no amount of polish elsewhere compensates for - which
 * is why a critical contradiction *caps* the readiness score rather than merely
 * reducing it.
 */

export type Severity = 'CRITICAL' | 'WARNING';

/**
 * Gaps at or below this are rounding, not disagreement.
 *
 * A deck rounding 8,24,000 to 8.2 lakh is not contradicting the model, and
 * reporting it as a contradiction would train founders to ignore the checker -
 * which costs more than the noise it removes.
 */
export const ROUNDING_TOLERANCE = 0.01;

/** Above this, two figures are not a rounding difference but a different claim. */
export const CRITICAL_GAP = 0.10;

/**
 * One figure as stated by one module.
 *
 * `module` is where the founder goes to fix it, so it must be the user-facing
 * name ("Pitch deck", "Financial model") rather than a table or field name.
 */
export interface Claim {
  readonly module: string;
  readonly field: string;
  readonly value: number;
  /** Where in that module, e.g. "Slide 15", so the founder can navigate to it. */
  readonly location?: string;
}

export interface Violation {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly summary: string;
  readonly detail: string;
  readonly claims: readonly Claim[];
  readonly suggestedFix: string;
}

export interface ConsistencyReport {
  readonly violations: readonly Violation[];
  readonly critical: readonly Violation[];
  readonly warnings: readonly Violation[];
  readonly isConsistent: boolean;
  /** Summaries of the critical violations, for the readiness ceiling. */
  readonly criticalSummaries: readonly string[];
}

export function where(claim: Claim): string {
  return claim.location ? `${claim.module} (${claim.location})` : claim.module;
}

/** Relative difference between two figures, against the larger magnitude. */
export function relativeGap(left: number, right: number): number {
  const scale = Math.max(Math.abs(left), Math.abs(right));
  if (scale === 0) return 0;
  return Math.abs(left - right) / scale;
}

export function severityForGap(gap: number): Severity {
  return gap > CRITICAL_GAP ? 'CRITICAL' : 'WARNING';
}

export function formatGap(gap: number): string {
  return `${(gap * 100).toFixed(1)}%`;
}
