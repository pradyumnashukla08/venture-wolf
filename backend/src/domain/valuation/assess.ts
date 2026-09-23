/**
 * Running whichever methods the inputs actually support.
 *
 * The temptation here is to make the valuation always work by supplying a
 * default comparable multiple and a default benchmark valuation. That would
 * reproduce, one layer down, exactly the defect this engine exists to fix: a
 * number with no defensible provenance, presented to a founder as a valuation.
 *
 * So this returns one of two things. Either a triangulation across the methods
 * whose inputs are genuinely present, or a refusal naming the inputs that are
 * missing and what each one would unlock. A refusal is a useful answer: it
 * tells the founder precisely what to go and find, which is more use than a
 * confident number built on defaults nobody chose.
 */

import { berkus, revenueMultiple, scorecard, vcMethod, type BerkusScores, type ScorecardFactors } from './methods.ts';
import { InsufficientMethodsError, triangulate, type TriangulatedValuation } from './triangulate.ts';
import { NotApplicableError, type ValuationEstimate } from './types.ts';

export interface ValuationInputs {
  /** Trailing or annualised revenue in INR. Enables the revenue multiple. */
  readonly annualRevenue?: number;
  /** Comparable-transaction multiple. Must come from real comparables. */
  readonly revenueMultipleFromComparables?: number;
  readonly growthRate?: number;

  /** Median valuation of comparable companies at this stage. Enables Scorecard. */
  readonly benchmarkValuation?: number;
  readonly scorecardFactors?: ScorecardFactors;

  /** Enables Berkus. Pre-revenue companies usually have only this. */
  readonly berkusScores?: BerkusScores;
  readonly berkusCeilingPerCategory?: number;

  /** Enables the VC method. All four are required together. */
  readonly forecastExitMetric?: number;
  readonly exitMultiple?: number;
  readonly requiredReturn?: number;
  readonly dilutionBeforeExit?: number;
}

export interface MissingInput {
  readonly method: string;
  readonly needs: readonly string[];
  readonly unlocks: string;
}

export type ValuationAssessment =
  | { readonly kind: 'triangulated'; readonly result: TriangulatedValuation; readonly missing: readonly MissingInput[] }
  | { readonly kind: 'insufficient'; readonly reason: string; readonly ran: readonly string[]; readonly missing: readonly MissingInput[] };

export function assessValuation(inputs: ValuationInputs): ValuationAssessment {
  const estimates: ValuationEstimate[] = [];
  const missing: MissingInput[] = [];

  const attempt = (
    method: string,
    needs: readonly string[],
    unlocks: string,
    run: () => ValuationEstimate,
  ): void => {
    const absent = needs.filter((key) => inputs[key as keyof ValuationInputs] === undefined);
    if (absent.length > 0) {
      missing.push({ method, needs: absent, unlocks });
      return;
    }
    try {
      estimates.push(run());
    } catch (err) {
      if (err instanceof NotApplicableError) {
        missing.push({ method, needs: [], unlocks: err.message });
        return;
      }
      throw err;
    }
  };

  attempt(
    'Berkus method',
    ['berkusScores'],
    'A pre-revenue anchor scored across five risk-reduction areas.',
    () => berkus(inputs.berkusScores!, inputs.berkusCeilingPerCategory),
  );

  attempt(
    'Scorecard method',
    ['benchmarkValuation', 'scorecardFactors'],
    'A valuation relative to comparable companies at the same stage.',
    () => scorecard(inputs.benchmarkValuation!, inputs.scorecardFactors!),
  );

  attempt(
    'Revenue multiple',
    ['annualRevenue', 'revenueMultipleFromComparables'],
    'The method an investor checks first once there is revenue to multiply.',
    () => revenueMultiple(
      inputs.annualRevenue!,
      inputs.revenueMultipleFromComparables!,
      inputs.growthRate === undefined ? {} : { growthRate: inputs.growthRate },
    ),
  );

  attempt(
    'VC method',
    ['forecastExitMetric', 'exitMultiple', 'requiredReturn', 'dilutionBeforeExit'],
    'What this round can support given a fund’s own return target.',
    () => vcMethod({
      forecastExitMetric: inputs.forecastExitMetric!,
      exitMultiple: inputs.exitMultiple!,
      requiredReturn: inputs.requiredReturn!,
      dilutionBeforeExit: inputs.dilutionBeforeExit!,
    }),
  );

  const ran = estimates.map((estimate) => estimate.method);

  try {
    return { kind: 'triangulated', result: triangulate(estimates), missing };
  } catch (err) {
    if (err instanceof InsufficientMethodsError) {
      return { kind: 'insufficient', reason: err.message, ran, missing };
    }
    throw err;
  }
}

/**
 * Is the figure the model proposed anywhere near what the methods support?
 *
 * The AI valuation is not replaced here — removing it would break the Excel
 * model and the client that reads it. It is *checked*, which is the honest
 * intermediate step: the founder sees both the proposed number and whether any
 * defensible method agrees with it.
 */
export function auditProposedValuation(
  proposed: number,
  assessment: ValuationAssessment,
): { readonly supported: boolean; readonly comment: string } {
  if (assessment.kind === 'insufficient') {
    return {
      supported: false,
      comment:
        'No valuation method could be run on the inputs available, so this ' +
        'figure is unverified. It was proposed by a model, not derived.',
    };
  }

  for (const range of assessment.result.ranges) {
    if (proposed >= range.low && proposed <= range.high) {
      return {
        supported: true,
        comment: `Within the ${range.basisLabel.toLowerCase()} range the methods support.`,
      };
    }
  }

  return {
    supported: false,
    comment:
      'Outside every range the applicable methods support. Be ready to explain ' +
      'which method produces this number, because an investor will ask.',
  };
}
