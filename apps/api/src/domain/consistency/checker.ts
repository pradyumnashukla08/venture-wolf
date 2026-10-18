/**
 * The rules, and running them.
 *
 * Two independent detectors, because they catch different mistakes:
 *
 * *   **Duplicate-figure divergence** catches the common case - the same
 *     figure quoted in two documents that has silently drifted because one was
 *     edited and the other was not. It needs no configuration: if two modules
 *     claim the same field, they must agree.
 *
 * *   **Semantic rules** catch contradictions between figures that are related
 *     but not identical, where no amount of comparing like with like would find
 *     the problem. A stated CAC that the marketing spend cannot produce, or a
 *     runway claim the cash and burn do not support.
 */

import {
  CRITICAL_GAP,
  ROUNDING_TOLERANCE,
  formatGap,
  relativeGap,
  severityForGap,
  where,
  type Claim,
  type ConsistencyReport,
  type Violation,
} from './types.ts';

/* --------------------------------------------------- duplicate divergence */

/**
 * Any field claimed by more than one module must be claimed identically.
 *
 * Compares every module against the first claimant rather than pairwise, so
 * three modules disagreeing produce two violations naming a common reference
 * point instead of three that a founder has to reconcile in their head.
 */
export function checkDuplicateFigures(claims: readonly Claim[]): Violation[] {
  const byField = new Map<string, Claim[]>();
  for (const claim of claims) {
    const group = byField.get(claim.field) ?? [];
    group.push(claim);
    byField.set(claim.field, group);
  }

  const violations: Violation[] = [];

  for (const [field, group] of byField) {
    if (group.length < 2) continue;
    const [reference, ...others] = group as [Claim, ...Claim[]];

    for (const other of others) {
      const gap = relativeGap(reference.value, other.value);
      if (gap <= ROUNDING_TOLERANCE) continue;

      violations.push({
        ruleId: 'consistency.figure_match',
        severity: severityForGap(gap),
        summary: `${field} disagrees between ${reference.module} and ${other.module}`,
        detail:
          `${where(reference)} states ${reference.value.toLocaleString('en-IN')}, ` +
          `while ${where(other)} states ${other.value.toLocaleString('en-IN')} - ` +
          `a gap of ${formatGap(gap)}. These are the same figure and must be identical.`,
        claims: [reference, other],
        suggestedFix:
          `Decide which is correct. The financial model is normally the source of ` +
          `truth, so update ${where(other)} to match unless the model itself is out of date.`,
      });
    }
  }

  return violations;
}

/* ------------------------------------------------------------ semantic rules */

export interface SemanticInputs {
  /** Marketing spend over the period, INR. */
  readonly marketingSpend?: Claim;
  /** New customers won in the same period. */
  readonly newCustomers?: Claim;
  /** CAC as stated by the founder. */
  readonly statedCac?: Claim;

  readonly cashBalance?: Claim;
  /** Net monthly burn. */
  readonly monthlyBurn?: Claim;
  /** Runway in months as stated by the founder. */
  readonly statedRunway?: Claim;

  readonly ltv?: Claim;
}

/**
 * A stated CAC must be the one the marketing spend actually produces.
 *
 * This is the contradiction an investor finds fastest, because it needs no
 * documents beyond the two the founder already showed them.
 */
export function checkImpliedCac(inputs: SemanticInputs): Violation[] {
  const { marketingSpend, newCustomers, statedCac } = inputs;
  if (!marketingSpend || !newCustomers || !statedCac) return [];
  if (newCustomers.value <= 0) return [];

  const implied = marketingSpend.value / newCustomers.value;
  const gap = relativeGap(implied, statedCac.value);
  if (gap <= ROUNDING_TOLERANCE) return [];

  return [{
    ruleId: 'consistency.implied_cac',
    severity: gap > CRITICAL_GAP ? 'CRITICAL' : 'WARNING',
    summary: 'Stated CAC does not match the spend that produced it',
    detail:
      `${where(marketingSpend)} shows ${marketingSpend.value.toLocaleString('en-IN')} of ` +
      `marketing spend winning ${newCustomers.value.toLocaleString('en-IN')} customers, ` +
      `which implies a CAC of ${Math.round(implied).toLocaleString('en-IN')}. ` +
      `${where(statedCac)} states ${statedCac.value.toLocaleString('en-IN')} - ` +
      `a gap of ${formatGap(gap)}.`,
    claims: [marketingSpend, newCustomers, statedCac],
    suggestedFix:
      'Either the stated CAC is wrong, or the spend excludes costs that belong in ' +
      'it (salaries, agency fees, tooling). An investor will divide these two ' +
      'numbers themselves, so decide which before they do.',
  }];
}

/**
 * A runway claim must follow from the cash and the burn.
 *
 * Treated as CRITICAL whenever the real runway is *shorter* than claimed, at
 * any gap above rounding: overstating runway is the single most consequential
 * inconsistency in a fundraise, because the whole raise is timed against it.
 */
export function checkRunwayClaim(inputs: SemanticInputs): Violation[] {
  const { cashBalance, monthlyBurn, statedRunway } = inputs;
  if (!cashBalance || !monthlyBurn || !statedRunway) return [];
  if (monthlyBurn.value <= 0) return [];

  const implied = cashBalance.value / monthlyBurn.value;
  const gap = relativeGap(implied, statedRunway.value);
  if (gap <= ROUNDING_TOLERANCE) return [];

  const overstated = statedRunway.value > implied;

  return [{
    ruleId: 'consistency.runway_claim',
    severity: overstated || gap > CRITICAL_GAP ? 'CRITICAL' : 'WARNING',
    summary: overstated
      ? 'Stated runway is longer than the cash and burn support'
      : 'Stated runway does not match the cash and burn',
    detail:
      `${where(cashBalance)} shows ${cashBalance.value.toLocaleString('en-IN')} against ` +
      `a monthly burn of ${monthlyBurn.value.toLocaleString('en-IN')}, which is ` +
      `${implied.toFixed(1)} months. ${where(statedRunway)} states ` +
      `${statedRunway.value} months - a gap of ${formatGap(gap)}.`,
    claims: [cashBalance, monthlyBurn, statedRunway],
    suggestedFix: overstated
      ? 'Correct the runway claim before it reaches an investor. A raise timed ' +
        'against a runway that does not exist fails in diligence, not in the pitch.'
      : 'Reconcile the figures. If burn is expected to change, state the assumption ' +
        'explicitly rather than leaving the arithmetic unexplained.',
  }];
}

/**
 * LTV below CAC is not an inconsistency to flag quietly.
 *
 * It is arithmetically coherent and commercially fatal, so it is reported as a
 * critical finding rather than left for the founder to notice.
 */
export function checkUnitEconomics(inputs: SemanticInputs): Violation[] {
  const { ltv, statedCac } = inputs;
  if (!ltv || !statedCac || statedCac.value <= 0) return [];
  if (ltv.value >= statedCac.value) return [];

  return [{
    ruleId: 'consistency.ltv_below_cac',
    severity: 'CRITICAL',
    summary: 'Lifetime value is below customer acquisition cost',
    detail:
      `${where(ltv)} states an LTV of ${ltv.value.toLocaleString('en-IN')} against a CAC ` +
      `of ${statedCac.value.toLocaleString('en-IN')} in ${where(statedCac)}. ` +
      `Every customer acquired loses money at these figures.`,
    claims: [ltv, statedCac],
    suggestedFix:
      'This is not a presentation problem. Either the figures are wrong, or the ' +
      'business does not yet work at this price and acquisition cost - and an ' +
      'investor will reach that conclusion in one line of arithmetic.',
  }];
}

/* ----------------------------------------------------------------- running */

export interface ConsistencyInputs extends SemanticInputs {
  /** Every figure any module claims, for duplicate detection. */
  readonly claims?: readonly Claim[];
}

/**
 * Run every rule and assemble the report.
 *
 * Rules that lack their inputs return nothing rather than guessing. A checker
 * that invents a missing figure in order to have something to say is worse than
 * one that stays quiet.
 */
export function checkConsistency(inputs: ConsistencyInputs): ConsistencyReport {
  const violations: Violation[] = [
    ...checkDuplicateFigures(inputs.claims ?? []),
    ...checkImpliedCac(inputs),
    ...checkRunwayClaim(inputs),
    ...checkUnitEconomics(inputs),
  ];

  const critical = violations.filter((v) => v.severity === 'CRITICAL');
  const warnings = violations.filter((v) => v.severity === 'WARNING');

  return {
    violations,
    critical,
    warnings,
    isConsistent: violations.length === 0,
    criticalSummaries: critical.map((v) => v.summary),
  };
}
