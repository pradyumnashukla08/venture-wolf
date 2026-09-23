/**
 * Labelling the forecast for what it is.
 *
 * `generateMarketAssumptions` asks Gemini to invent every driver in the model —
 * starting MRR, churn, growth, and the valuation the founder will quote to an
 * investor. Those are defensible starting points for a conversation. None of
 * them is something the company measured.
 *
 * This module attaches that distinction to the response, so the client can
 * render an assumed figure differently from a measured one instead of having to
 * guess. It does not change a single number.
 */

import { assumption, type AssumptionSource, type Traced } from './types.ts';

/** Why each driver is an assumption, in the founder's language. */
const RATIONALES: Record<string, string> = {
  dpiitTaxHolidayActive: 'Assumed DPIIT eligibility; confirm against your recognition certificate.',
  employerPfBurden: 'Statutory EPF/EPS/EDLI and gratuity burden, held within 10-15%.',
  interestRateOnDebt: 'Indian debt cost; floored at 9.5% even in the best case.',
  annualInflationRate: 'Anchored to RBI indices rather than the model inventing a rate.',
  initialMetric: 'Baseline read from your profile and pitch deck, not measured by us.',
  growthRateOrYield: 'Growth assumed for this archetype, with decay applied as the base scales.',
  pricingMetric: 'Churn, price inflation or billing growth assumed for this archetype.',
  cogsMargin: 'Delivery cost assumed, including payment gateway and cloud.',
  annualPayrollIncrease: 'Annual increment assumed for the Indian market.',
  marketingSpendPct: 'Marketing budget assumed as a share of revenue.',
  receivableDays: 'Collection period assumed from Indian distribution norms.',
  inventoryDays: 'Inventory holding period assumed for this archetype.',
  payableDays: 'Supplier credit assumed for this archetype.',
  estimatedValuation: 'PROPOSED BY THE MODEL. Not a valuation opinion, and not measured.',
  equityDilutionPct: 'Implied by the proposed valuation and your target raise.',
};

export type ScenarioName = 'Worst' | 'Base' | 'Best';

export type TracedScenario = Record<string, Traced<number>>;

/** Tag one scenario's drivers as assumptions attributed to the model. */
export function traceScenario(
  scenario: Record<string, number>,
  scenarioName: ScenarioName,
): TracedScenario {
  const traced: TracedScenario = {};
  for (const [driver, value] of Object.entries(scenario)) {
    const source: AssumptionSource = {
      key: `ai.market_assumptions.${scenarioName.toLowerCase()}.${driver}`,
      origin: 'llm',
      rationale: RATIONALES[driver] ?? 'Assumed by the forecast model.',
    };
    traced[driver] = assumption(value, source);
  }
  return traced;
}

/**
 * Tag a full Worst/Base/Best set.
 *
 * Returned alongside the raw assumptions rather than replacing them, so the
 * existing Excel injection and the mobile client keep working unchanged while
 * the client gains somewhere honest to read provenance from.
 */
export function traceAssumptions(
  assumptions: Record<ScenarioName, Record<string, number>>,
): Record<ScenarioName, TracedScenario> {
  return {
    Worst: traceScenario(assumptions.Worst, 'Worst'),
    Base: traceScenario(assumptions.Base, 'Base'),
    Best: traceScenario(assumptions.Best, 'Best'),
  };
}

/**
 * The one-line disclosure the UI must show next to any projection built from
 * these drivers. Deliberately not optional and not configurable.
 */
export const FORECAST_DISCLOSURE =
  'Every figure in this forecast is an assumption proposed by a model from your ' +
  'profile and data room. None of it has been measured or verified. Review each ' +
  'driver before showing these numbers to an investor.';
