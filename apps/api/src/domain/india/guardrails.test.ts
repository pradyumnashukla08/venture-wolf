import { test } from 'node:test';
import assert from 'node:assert/strict';

import { enforceGuardrails, renderGuardrails } from './enforce.ts';
import { ARCHETYPE_GUARDRAILS, MACRO_GUARDRAILS } from './guardrails.ts';
import { SCENARIOS, type Archetype } from './types.ts';

const ARCHETYPES: Archetype[] = ['SAAS', 'MANUFACTURING', 'SERVICES'];

/** A scenario that breaks nothing, so each test isolates one violation. */
function compliant(): Record<string, number> {
  return {
    employerPfBurden: 0.12,
    interestRateOnDebt: 0.12,
    annualInflationRate: 0.06,
    initialMetric: 500_000,
    growthRateOrYield: 0.10,
    pricingMetric: 0.05,
    cogsMargin: 0.30,
    receivableDays: 60,
  };
}

function scenarios(overrides: Partial<Record<string, Record<string, number>>> = {}) {
  return {
    Worst: { ...compliant(), interestRateOnDebt: 0.18, annualInflationRate: 0.09, ...overrides.Worst },
    Base: { ...compliant(), ...overrides.Base },
    Best: { ...compliant(), ...overrides.Best },
  };
}

test('compliant assumptions pass through untouched', () => {
  const input = scenarios();
  const { assumptions, corrections } = enforceGuardrails(input, 'SAAS');
  assert.deepEqual(corrections, []);
  assert.deepEqual(assumptions, input);
});

test('SaaS churn below the 2% floor is corrected', () => {
  const { assumptions, corrections } = enforceGuardrails(
    scenarios({ Base: { ...compliant(), pricingMetric: 0.001 } }),
    'SAAS',
  );
  assert.equal(assumptions.Base.pricingMetric, 0.02);
  const correction = corrections.find((c) => c.driver === 'pricingMetric');
  assert.equal(correction?.proposed, 0.001);
  assert.equal(correction?.corrected, 0.02);
  assert.match(correction!.because, /churn/i);
});

test('SaaS best-case growth above 25% MoM is capped', () => {
  const { assumptions } = enforceGuardrails(
    scenarios({ Best: { ...compliant(), growthRateOrYield: 0.60 } }),
    'SAAS',
  );
  assert.equal(assumptions.Best.growthRateOrYield, 0.25);
});

test('the best-case growth cap does not apply to other scenarios', () => {
  const { assumptions, corrections } = enforceGuardrails(
    scenarios({ Base: { ...compliant(), growthRateOrYield: 0.40 } }),
    'SAAS',
  );
  assert.equal(assumptions.Base.growthRateOrYield, 0.40);
  assert.equal(corrections.some((c) => c.driver === 'growthRateOrYield'), false);
});

test('manufacturing yield above 96% is capped in every scenario', () => {
  const { assumptions } = enforceGuardrails(
    scenarios({ Best: { ...compliant(), growthRateOrYield: 0.99 } }),
    'MANUFACTURING',
  );
  assert.equal(assumptions.Best.growthRateOrYield, 0.96);
});

test('services utilisation above 85% is capped', () => {
  const { assumptions } = enforceGuardrails(
    scenarios({ Best: { ...compliant(), growthRateOrYield: 0.95 } }),
    'SERVICES',
  );
  assert.equal(assumptions.Best.growthRateOrYield, 0.85);
});

test('EPF burden is held inside the statutory band from either side', () => {
  const low = enforceGuardrails(scenarios({ Base: { ...compliant(), employerPfBurden: 0.02 } }), 'SAAS');
  assert.equal(low.assumptions.Base.employerPfBurden, 0.10);

  const high = enforceGuardrails(scenarios({ Base: { ...compliant(), employerPfBurden: 0.40 } }), 'SAAS');
  assert.equal(high.assumptions.Base.employerPfBurden, 0.15);
});

test('the worst case must carry a distressed borrowing rate', () => {
  const { assumptions } = enforceGuardrails(
    scenarios({ Worst: { ...compliant(), interestRateOnDebt: 0.10 } }),
    'SAAS',
  );
  assert.equal(assumptions.Worst.interestRateOnDebt, 0.16);
});

test('a scenario the model omitted does not throw', () => {
  const partial = { Base: compliant() } as any;
  const { corrections } = enforceGuardrails(partial, 'SAAS');
  assert.deepEqual(corrections, []);
});

test('non-numeric values are left alone rather than coerced', () => {
  const input = { Base: { ...compliant(), pricingMetric: Number.NaN } } as any;
  const { assumptions } = enforceGuardrails(input, 'SAAS');
  assert.ok(Number.isNaN(assumptions.Base.pricingMetric));
});

test('the prompt states every enforced bound, for every archetype', () => {
  for (const archetype of ARCHETYPES) {
    const rendered = renderGuardrails(archetype);
    const rules = [...MACRO_GUARDRAILS.rules, ...ARCHETYPE_GUARDRAILS[archetype].rules];

    for (const rule of rules) {
      assert.ok(rendered.includes(rule.driver), `${archetype}: prompt omits ${rule.driver}`);
      for (const bound of rule.bounds) {
        const limit = bound.min ?? bound.max;
        assert.ok(
          rendered.includes(String(limit)),
          `${archetype}: prompt omits the ${limit} limit on ${rule.driver}`,
        );
      }
    }
  }
});

test('enforcement never leaves a value outside its own bounds', () => {
  for (const archetype of ARCHETYPES) {
    const wild = {
      Worst: { ...compliant(), growthRateOrYield: 99, pricingMetric: -5, employerPfBurden: 9 },
      Base: { ...compliant(), growthRateOrYield: -1, cogsMargin: -2, receivableDays: -10 },
      Best: { ...compliant(), growthRateOrYield: 99, interestRateOnDebt: 0, annualInflationRate: 0 },
    };
    const { assumptions } = enforceGuardrails(wild, archetype);
    const second = enforceGuardrails(assumptions, archetype);
    assert.deepEqual(second.corrections, [], `${archetype}: enforcement is not idempotent`);
  }
});

test('every scenario name is covered', () => {
  assert.deepEqual([...SCENARIOS], ['Worst', 'Base', 'Best']);
});
