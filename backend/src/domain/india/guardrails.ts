/**
 * The rules themselves, transcribed from the prompt in `financeAnalyst.ts`.
 *
 * Every bound here appears in that prompt as an explicit floor, ceiling or
 * range. Nothing has been added, tightened or invented: where the prompt states
 * a target rather than a limit, it is recorded as `guidance` and left
 * unenforced.
 */

import type { Archetype, GuardrailSet } from './types.ts';

/**
 * Statutory and macroeconomic rules, applied whatever the company does.
 *
 * These are the part of the domain knowledge that is genuinely India-specific
 * and genuinely hard: an EPF burden or an RBI-anchored inflation band is not
 * something a general-purpose model gets right unprompted.
 */
export const MACRO_GUARDRAILS: GuardrailSet = {
  title: 'Macro & statutory rules (no exceptions)',
  rules: [
    {
      driver: 'employerPfBurden',
      meaning: 'Employer provident fund burden as a share of payroll.',
      bounds: [{
        min: 0.10,
        max: 0.15,
        because:
          'Mandatory Indian EPF, EPS, EDLI and gratuity together fall between ' +
          '10% and 15% of payroll. A model that omits them understates cost of ' +
          'employment for every Indian company.',
      }],
      guidance: 'Typically 0.12.',
    },
    {
      driver: 'interestRateOnDebt',
      meaning: 'Annual interest rate on borrowed capital.',
      bounds: [
        {
          min: 0.095,
          because: 'Indian debt is expensive; 9.5% is the floor even in the best case.',
        },
        {
          scenario: 'Worst',
          min: 0.16,
          because: 'A punitive case must reflect the cost of distressed borrowing.',
        },
      ],
      guidance: 'Best 9.5%, Base 12%, Worst 16%+.',
    },
    {
      driver: 'annualInflationRate',
      meaning: 'Annual cost inflation.',
      bounds: [
        { min: 0.045, because: 'Anchored to RBI indices rather than an invented rate.' },
        {
          scenario: 'Worst',
          min: 0.085,
          because: 'A punitive case must carry an inflation shock.',
        },
      ],
      guidance: 'Best 4.5%, Base 6%, Worst 8.5%+.',
    },
  ],
};

/**
 * What the shared driver names mean per archetype, and their limits.
 *
 * `initialMetric`, `growthRateOrYield` and `pricingMetric` are deliberately
 * generic in the schema and mean something different in each archetype. That
 * reuse is why the meanings have to be stated somewhere explicit: a reader of
 * `ScenarioMetricsSchema` alone cannot tell whether `pricingMetric` is a churn
 * rate or a billing increase.
 */
export const ARCHETYPE_GUARDRAILS: Record<Archetype, GuardrailSet> = {
  SAAS: {
    title: 'SaaS',
    rules: [
      {
        driver: 'initialMetric',
        meaning: 'Starting MRR in INR, anchored to the data room.',
        bounds: [{ min: 0, because: 'Revenue cannot start negative.' }],
      },
      {
        driver: 'growthRateOrYield',
        meaning: 'Month-on-month growth rate.',
        bounds: [{
          scenario: 'Best',
          max: 0.25,
          because: '25% MoM sustained is already top-decile; beyond it the five-year model becomes fiction.',
        }],
        guidance: 'Worst case 2-5% MoM.',
      },
      {
        driver: 'pricingMetric',
        meaning: 'Monthly churn rate.',
        bounds: [{
          min: 0.02,
          because:
            'No Indian SMB SaaS business sustains below 2% monthly churn. Zero ' +
            'or near-zero churn makes LTV explode and every downstream ratio meaningless.',
        }],
        guidance: 'Base 5-7%, Worst 10-14%.',
      },
      {
        driver: 'cogsMargin',
        meaning: 'Direct delivery cost as a share of revenue.',
        bounds: [{
          min: 0.15,
          because: 'Payment gateway fees and AWS India together floor delivery cost at 15%.',
        }],
      },
    ],
  },

  MANUFACTURING: {
    title: 'Manufacturing',
    rules: [
      {
        driver: 'initialMetric',
        meaning: 'Installed monthly capacity, in units.',
        bounds: [{ min: 0, because: 'Capacity cannot be negative.' }],
      },
      {
        driver: 'growthRateOrYield',
        meaning: 'Target yield.',
        bounds: [{
          max: 0.96,
          because:
            'Indian grid reliability and supply chain friction cap realistic ' +
            'yield at 96%. A model assuming better is assuming a different country.',
        }],
        guidance: 'Worst case 75-80%.',
      },
      {
        driver: 'receivableDays',
        meaning: 'Days to collect from distributors.',
        bounds: [{
          scenario: 'Best',
          min: 30,
          because: 'Indian distribution networks do not pay faster than 30 days.',
        }],
        guidance: 'Base 60, Worst 90+.',
      },
    ],
  },

  SERVICES: {
    title: 'Services',
    rules: [
      {
        driver: 'initialMetric',
        meaning: 'Starting billable headcount.',
        bounds: [{ min: 0, because: 'Headcount cannot be negative.' }],
      },
      {
        driver: 'growthRateOrYield',
        meaning: 'Employee utilisation rate.',
        bounds: [{
          max: 0.85,
          because:
            'Above 85% utilisation a services business is burning its people, ' +
            'and the attrition that follows is not in the model.',
        }],
        guidance: 'Worst case 50-55%.',
      },
      {
        driver: 'receivableDays',
        meaning: 'Days to collect from corporate clients.',
        bounds: [{
          scenario: 'Base',
          min: 45,
          because: 'Corporate clients stretch credit; 45 days is the realistic base.',
        }],
      },
    ],
  },
};
