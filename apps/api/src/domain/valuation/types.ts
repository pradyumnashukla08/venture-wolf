/**
 * Valuation, without pretending the methods agree.
 *
 * Ported from WaoU-Fund's `engines/valuation`. The governing idea, which this
 * codebase currently does the opposite of:
 *
 *     There is no single correct valuation formula. You triangulate across
 *     several methods and defend the number that results.
 *
 * Today `generateMarketAssumptions` asks Gemini for one `estimatedValuation`
 * per scenario and the founder quotes it to an investor. Nothing says which
 * method produced it, what it assumed, or how far the methods would disagree —
 * because no method produced it. A model produced it.
 *
 * So no function here returns "the valuation". Each returns a
 * `ValuationEstimate` that knows what it computed, how well it fits this
 * company, and what an investor will attack about it. `triangulate` combines
 * them *without* collapsing the spread, because the spread is the finding: a
 * tight cluster across four methods is a defensible position, and a 10x spread
 * means the company does not yet have one — which the founder needs to hear
 * before an investor tells them.
 */

export type ValuationMethodName =
  | 'BERKUS'
  | 'SCORECARD'
  | 'VC_METHOD'
  | 'REVENUE_MULTIPLE';

export const METHOD_LABELS: Record<ValuationMethodName, string> = {
  BERKUS: 'Berkus method',
  SCORECARD: 'Scorecard method',
  VC_METHOD: 'Venture capital method',
  REVENUE_MULTIPLE: 'Revenue multiple',
};

/**
 * What a method's headline figure actually measures.
 *
 * Methods do not all answer the same question. A revenue multiple produces
 * enterprise value; Berkus and Scorecard produce a pre-money equity value; the
 * VC method produces the post-money valuation a round can support. Averaging a
 * pre-money with a post-money figure silently mixes quantities that differ by
 * the new money itself — so every estimate declares its basis and triangulation
 * refuses to blend across bases.
 */
export type ValuationBasis = 'ENTERPRISE_VALUE' | 'PRE_MONEY' | 'POST_MONEY';

export const BASIS_LABELS: Record<ValuationBasis, string> = {
  ENTERPRISE_VALUE: 'Enterprise value',
  PRE_MONEY: 'Pre-money valuation',
  POST_MONEY: 'Post-money valuation',
};

/**
 * How well a method fits this company, decided by the method itself.
 *
 * A poorly fitting method is run and labelled rather than hidden: an investor
 * who asks "did you look at a revenue multiple?" gets a real answer, together
 * with the reason it was not the anchor.
 */
export type Applicability = 'PRIMARY' | 'SUPPORTING' | 'WEAK';

/** Triangulation weights. Declared here because they change the founder's number. */
export const APPLICABILITY_WEIGHTS: Record<Applicability, number> = {
  PRIMARY: 1.0,
  SUPPORTING: 0.5,
  WEAK: 0.2,
};

export interface ValuationEstimate {
  readonly method: ValuationMethodName;
  readonly basis: ValuationBasis;
  /** INR. */
  readonly value: number;
  readonly applicability: Applicability;
  /** Plain language, shown beside the number. */
  readonly applicabilityReason: string;
  readonly formula: string;
  /** What an investor will challenge, stated first by us. */
  readonly caveats: readonly string[];
}

/**
 * The arithmetic is undefined on these inputs — distinct from a method that
 * merely fits badly. An EBITDA multiple on negative EBITDA is not applicable;
 * a DCF on a pre-revenue company is applicable and weak.
 */
export class NotApplicableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotApplicableError';
  }
}
