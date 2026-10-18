/**
 * Combining methods without pretending they agree.
 *
 * This module refuses to return a single valuation. It returns a range built
 * only from methods that actually apply, weighted by how well they apply,
 * together with the disagreement between them — because the disagreement is the
 * finding. A tight cluster across several methods is a strong position; a 10x
 * spread means the company does not yet have a defensible valuation, and the
 * founder needs to know that before an investor tells them.
 *
 * Bases are never blended. A pre-money figure and a post-money figure differ by
 * the new money itself; averaging them produces a number that measures nothing.
 * Estimates are therefore grouped by basis and each group is summarised
 * separately.
 */

import {
  APPLICABILITY_WEIGHTS,
  BASIS_LABELS,
  METHOD_LABELS,
  type ValuationBasis,
  type ValuationEstimate,
} from './types.ts';

/**
 * Below two methods there is nothing to triangulate.
 *
 * A single method presented as a range would be a false claim of corroboration,
 * which is the specific failure this module exists to prevent.
 */
export const MINIMUM_METHODS = 2;

/** A spread wider than this means the methods do not agree on the company. */
export const INDEFENSIBLE_SPREAD_RATIO = 3;

export class InsufficientMethodsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientMethodsError';
  }
}

export interface BasisRange {
  readonly basis: ValuationBasis;
  readonly basisLabel: string;
  readonly low: number;
  readonly high: number;
  /** Applicability-weighted mean. */
  readonly central: number;
  /** Unweighted median, shown so the effect of the weighting is visible. */
  readonly median: number;
  /** high / low. 1 means perfect agreement. */
  readonly spreadRatio: number;
  readonly methods: readonly string[];
}

export interface TriangulatedValuation {
  readonly ranges: readonly BasisRange[];
  readonly estimates: readonly ValuationEstimate[];
  /** True when any basis disagrees by more than the indefensible threshold. */
  readonly isDefensible: boolean;
  /** What the founder should be told, in one paragraph. */
  readonly narrative: string;
  readonly caveats: readonly string[];
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function summarise(basis: ValuationBasis, group: readonly ValuationEstimate[]): BasisRange {
  const values = group.map((estimate) => estimate.value);

  let weightedSum = 0;
  let weightTotal = 0;
  for (const estimate of group) {
    const weight = APPLICABILITY_WEIGHTS[estimate.applicability];
    weightedSum += estimate.value * weight;
    weightTotal += weight;
  }

  const low = Math.min(...values);
  const high = Math.max(...values);

  return {
    basis,
    basisLabel: BASIS_LABELS[basis],
    low,
    high,
    central: weightTotal > 0 ? weightedSum / weightTotal : median(values),
    median: median(values),
    // A zero or negative low makes a ratio meaningless rather than infinite.
    spreadRatio: low > 0 ? high / low : Number.POSITIVE_INFINITY,
    methods: group.map((estimate) => METHOD_LABELS[estimate.method]),
  };
}

function inr(value: number): string {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

/**
 * Triangulate across methods, grouped by what each one measures.
 *
 * Throws `InsufficientMethodsError` below two methods rather than returning a
 * single number dressed as a range.
 */
export function triangulate(
  estimates: readonly ValuationEstimate[],
): TriangulatedValuation {
  if (estimates.length < MINIMUM_METHODS) {
    throw new InsufficientMethodsError(
      `Triangulation needs at least ${MINIMUM_METHODS} applicable methods; ` +
      `${estimates.length} supplied. A single method presented as a range ` +
      `would claim corroboration that does not exist.`,
    );
  }

  const byBasis = new Map<ValuationBasis, ValuationEstimate[]>();
  for (const estimate of estimates) {
    const group = byBasis.get(estimate.basis) ?? [];
    group.push(estimate);
    byBasis.set(estimate.basis, group);
  }

  const ranges = [...byBasis.entries()].map(([basis, group]) => summarise(basis, group));
  const widest = Math.max(...ranges.map((range) => range.spreadRatio));
  const isDefensible = widest <= INDEFENSIBLE_SPREAD_RATIO;

  const caveats = [
    ...new Set(estimates.flatMap((estimate) => estimate.caveats)),
  ];

  if (byBasis.size > 1) {
    caveats.push(
      'Methods measuring different things are reported separately. A pre-money ' +
      'figure and a post-money figure differ by the new money itself and must ' +
      'not be averaged together.',
    );
  }

  const parts = ranges.map(
    (range) =>
      `${range.basisLabel}: ${inr(range.low)} to ${inr(range.high)}, ` +
      `centred on ${inr(range.central)} across ${range.methods.length} ` +
      `method${range.methods.length === 1 ? '' : 's'} ` +
      `(${range.methods.join(', ')}).`,
  );

  const verdict = isDefensible
    ? `The methods agree within ${widest.toFixed(1)}x, which is a defensible position to take into a conversation.`
    : `The methods disagree by ${widest.toFixed(1)}x. That is not yet a defensible valuation: ` +
      `the range itself is the finding, and an investor will ask which method you believe and why.`;

  return {
    ranges,
    estimates,
    isDefensible,
    narrative: `${parts.join(' ')} ${verdict}`,
    caveats,
  };
}
