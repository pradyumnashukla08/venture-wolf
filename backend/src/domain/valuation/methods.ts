/**
 * The four methods, ported from WaoU-Fund's `engines/valuation`.
 *
 * Each declares its own applicability. None of them is "the" answer.
 */

import {
  NotApplicableError,
  type Applicability,
  type ValuationEstimate,
} from './types.ts';

/* ------------------------------------------------------------------ Berkus */

export const BERKUS_CATEGORIES = {
  soundIdea: 'Sound idea — a real problem worth solving',
  prototype: 'Prototype or working product — reduces technology risk',
  qualityTeam: 'Quality management team — reduces execution risk',
  strategicRelationships: 'Strategic relationships — reduces market risk',
  productRollout: 'Product rollout or sales — reduces production risk',
} as const;

export type BerkusScores = Record<keyof typeof BERKUS_CATEGORIES, number>;

/**
 * A market convention, not a derived figure.
 *
 * Berkus caps each of five categories at a fixed ceiling, so the method's
 * total is bounded by convention rather than by anything about this company.
 * The original US formulation used $500k per category; this is an INR figure
 * of the same character and it **must be calibrated** against the market the
 * company actually raises in. It is exported so that calibration is a change
 * to one value, not a hunt through the arithmetic.
 */
export const BERKUS_CEILING_PER_CATEGORY_INR = 4_000_000;

/**
 * Berkus: five risk-reduction areas, each scored 0-1 of a fixed ceiling.
 *
 * The method's honest description is that it is a *structured opinion*, not a
 * measurement — which is exactly why it belongs beside other methods rather
 * than alone.
 */
export function berkus(
  scores: BerkusScores,
  ceilingPerCategory: number = BERKUS_CEILING_PER_CATEGORY_INR,
): ValuationEstimate {
  if (ceilingPerCategory <= 0) {
    throw new NotApplicableError('The Berkus per-category ceiling must be positive.');
  }

  let total = 0;
  for (const key of Object.keys(BERKUS_CATEGORIES) as (keyof BerkusScores)[]) {
    const score = scores[key];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new NotApplicableError(`Berkus needs a score for "${key}".`);
    }
    if (score < 0 || score > 1) {
      throw new NotApplicableError(`Berkus score for "${key}" must be between 0 and 1.`);
    }
    total += score * ceilingPerCategory;
  }

  return {
    method: 'BERKUS',
    basis: 'PRE_MONEY',
    value: total,
    applicability: 'PRIMARY',
    applicabilityReason:
      'Designed for pre-revenue companies, where there is no revenue to multiply.',
    formula: 'Pre-money = SUM over 5 categories of (score x ceiling per category)',
    caveats: [
      'The per-category ceiling is a market convention, not a derived figure. ' +
      'An outstanding team and a merely solid one both top out at the same ceiling.',
      `Bounded above at ${(ceilingPerCategory * 5).toLocaleString('en-IN')} INR ` +
      'however strong the company is.',
      'A structured opinion rather than a measurement.',
    ],
  };
}

/* --------------------------------------------------------------- Scorecard */

export const SCORECARD_FACTORS = {
  team: 'Strength of the team',
  market: 'Size of the opportunity',
  product: 'Product and technology',
  competition: 'Competitive environment',
  traction: 'Traction and route to customers',
  fundingNeed: 'Funding requirement',
} as const;

/**
 * Conventional Scorecard weighting, in percent, summing to 100.
 *
 * `traction` absorbs the original formulation's marketing/sales/partnerships
 * factor along with its residual "other" bucket, so that the weights sum
 * exactly rather than leaving an unallocated remainder someone later has to
 * guess at.
 */
export const SCORECARD_WEIGHTS: Record<keyof typeof SCORECARD_FACTORS, number> = {
  team: 30,
  market: 25,
  product: 15,
  competition: 10,
  traction: 15,
  fundingNeed: 5,
};

export type ScorecardFactors = Record<keyof typeof SCORECARD_FACTORS, number>;

/** A factor this far above par reads as a scoring error, not a finding. */
const IMPLAUSIBLE_FACTOR = 3;

/**
 * Scorecard: adjust a benchmark valuation by weighted relative strength.
 *
 * Each factor is expressed relative to the comparable company set, where 1.0 is
 * par. The result is only as good as the benchmark it starts from, which is the
 * caveat an investor reaches for first.
 */
export function scorecard(
  benchmarkValuation: number,
  factors: ScorecardFactors,
): ValuationEstimate {
  if (!(benchmarkValuation > 0)) {
    throw new NotApplicableError('Scorecard needs a positive benchmark valuation.');
  }

  let multiplier = 0;
  const overscored: string[] = [];

  for (const key of Object.keys(SCORECARD_WEIGHTS) as (keyof ScorecardFactors)[]) {
    const factor = factors[key];
    if (typeof factor !== 'number' || !Number.isFinite(factor) || factor < 0) {
      throw new NotApplicableError(`Scorecard needs a non-negative factor for "${key}".`);
    }
    if (factor > IMPLAUSIBLE_FACTOR) overscored.push(key);
    multiplier += (SCORECARD_WEIGHTS[key] / 100) * factor;
  }

  const caveats = [
    'Entirely dependent on the benchmark valuation it starts from. A benchmark ' +
    'drawn from a different market or vintage moves this number proportionally.',
    `Implied multiplier against comparable companies: ${multiplier.toFixed(2)}x.`,
  ];

  if (overscored.length > 0) {
    caveats.push(
      `Scored more than ${IMPLAUSIBLE_FACTOR}x par on: ${overscored.join(', ')}. ` +
      'That is usually a scoring error rather than a real finding.',
    );
  }

  return {
    method: 'SCORECARD',
    basis: 'PRE_MONEY',
    value: benchmarkValuation * multiplier,
    applicability: overscored.length > 0 ? 'WEAK' : 'PRIMARY',
    applicabilityReason:
      overscored.length > 0
        ? 'Implausible factor scores make this estimate unreliable.'
        : 'Standard for pre-revenue and early-revenue companies with a credible benchmark.',
    formula: 'Pre-money = Benchmark x SUM(weight_i x relative_factor_i)',
    caveats,
  };
}

/* --------------------------------------------------------------- VC method */

export interface VcMethodInputs {
  /** The metric at exit the multiple applies to — typically exit-year revenue. */
  readonly forecastExitMetric: number;
  readonly exitMultiple: number;
  /** The fund's required return, e.g. 10 for 10x. */
  readonly requiredReturn: number;
  /** Share given away in later rounds before exit, 0-1. */
  readonly dilutionBeforeExit: number;
}

/**
 * VC method: what today's round can support, given a fund's return maths.
 *
 * The critical property, and the reason it is never a PRIMARY anchor here: the
 * required return is a property of the *investor's fund*, not of this company.
 * A different fund produces a different valuation from identical company facts.
 */
export function vcMethod(inputs: VcMethodInputs): ValuationEstimate {
  const { forecastExitMetric, exitMultiple, requiredReturn, dilutionBeforeExit } = inputs;

  if (!(forecastExitMetric > 0)) {
    throw new NotApplicableError('The VC method needs a positive forecast exit metric.');
  }
  if (!(exitMultiple > 0)) {
    throw new NotApplicableError('The VC method needs a positive exit multiple.');
  }
  if (!(requiredReturn > 0)) {
    throw new NotApplicableError('The required return multiple must be positive.');
  }
  if (dilutionBeforeExit < 0 || dilutionBeforeExit >= 1) {
    throw new NotApplicableError('Dilution before exit must be between 0 and 1.');
  }

  const exitValue = forecastExitMetric * exitMultiple;
  const simplified = exitValue / requiredReturn;
  const postMoney = simplified * (1 - dilutionBeforeExit);

  return {
    method: 'VC_METHOD',
    basis: 'POST_MONEY',
    value: postMoney,
    applicability: 'SUPPORTING',
    applicabilityReason:
      'Describes what a fund can pay to hit its own return target, so it is ' +
      'informative about the round rather than about the company.',
    formula: 'Post-money = (Exit value / Required return) x (1 - dilution before exit)',
    caveats: [
      'The required return is a property of the fund mathematics of the investor, ' +
      'not of this company. A different fund will produce a different number ' +
      'from identical company facts.',
      'The exit multiple should be anchored to real comparable exits in this ' +
      'sector, not to current private-round multiples.',
      'Rests on a forecast several years out, which compounds every assumption ' +
      'underneath it.',
    ],
  };
}

/* -------------------------------------------------------- Revenue multiple */

/** Below this, a multiple amplifies noise rather than describing a business. */
const THIN_REVENUE_INR = 1_000_000;

/**
 * Revenue multiple: the method an investor checks first, where it applies.
 *
 * Applicability falls away as revenue does. At 2 lakh of annual revenue, a
 * 1 lakh swing moves the valuation by half, which is a statement about the
 * smallness of the base rather than about the company.
 */
export function revenueMultiple(
  annualRevenue: number,
  multiple: number,
  options: { readonly growthRate?: number } = {},
): ValuationEstimate {
  if (!(annualRevenue > 0)) {
    throw new NotApplicableError(
      'A revenue multiple needs positive revenue. Use a pre-revenue method instead.',
    );
  }
  if (!(multiple > 0)) {
    throw new NotApplicableError('The revenue multiple must be positive.');
  }

  const thin = annualRevenue < THIN_REVENUE_INR;
  let applicability: Applicability = thin ? 'WEAK' : 'PRIMARY';

  const caveats = [
    'The multiple carries the entire judgement. Sourcing it from current ' +
    'private-round headlines rather than comparable transactions is the most ' +
    'common way this number becomes indefensible.',
  ];

  if (thin) {
    caveats.push(
      'Revenue is too thin for a multiple to be meaningful: a small absolute ' +
      'change in revenue moves the valuation disproportionately.',
    );
  }

  if (options.growthRate !== undefined && options.growthRate < 0.2) {
    if (applicability === 'PRIMARY') applicability = 'SUPPORTING';
    caveats.push(
      'Growth below 20% does not support a venture revenue multiple; ' +
      'comparable slower-growing companies trade materially lower.',
    );
  }

  return {
    method: 'REVENUE_MULTIPLE',
    basis: 'ENTERPRISE_VALUE',
    value: annualRevenue * multiple,
    applicability,
    applicabilityReason:
      applicability === 'PRIMARY'
        ? 'Revenue is substantial enough for a multiple to describe the business.'
        : 'Computed for completeness; the inputs do not support leading with it.',
    formula: 'Enterprise value = Annual revenue x Multiple',
    caveats,
  };
}
