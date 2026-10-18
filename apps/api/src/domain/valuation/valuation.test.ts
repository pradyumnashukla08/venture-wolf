import { test } from 'node:test';
import assert from 'node:assert/strict';

import { berkus, scorecard, vcMethod, revenueMultiple, SCORECARD_WEIGHTS } from './methods.ts';
import { triangulate, InsufficientMethodsError, MINIMUM_METHODS } from './triangulate.ts';
import { NotApplicableError, type ValuationEstimate } from './types.ts';

const perfectBerkus = {
  soundIdea: 1, prototype: 1, qualityTeam: 1, strategicRelationships: 1, productRollout: 1,
};
const parFactors = {
  team: 1, market: 1, product: 1, competition: 1, traction: 1, fundingNeed: 1,
};

/* ------------------------------------------------------------------ Berkus */

test('Berkus is bounded by its ceiling however strong the company', () => {
  const estimate = berkus(perfectBerkus, 4_000_000);
  assert.equal(estimate.value, 20_000_000);
  assert.equal(estimate.basis, 'PRE_MONEY');
});

test('Berkus scores are a share of the ceiling', () => {
  const estimate = berkus({ ...perfectBerkus, prototype: 0.5, productRollout: 0 }, 4_000_000);
  assert.equal(estimate.value, 4_000_000 * 3.5);
});

test('Berkus refuses a score outside 0 to 1', () => {
  assert.throws(() => berkus({ ...perfectBerkus, qualityTeam: 4 }, 4_000_000), NotApplicableError);
  assert.throws(() => berkus({ ...perfectBerkus, prototype: -1 }, 4_000_000), NotApplicableError);
});

test('Berkus refuses a missing category rather than scoring it zero', () => {
  const incomplete = { soundIdea: 1, prototype: 1 } as any;
  assert.throws(() => berkus(incomplete), NotApplicableError);
});

/* --------------------------------------------------------------- Scorecard */

test('Scorecard weights sum to 100', () => {
  const total = Object.values(SCORECARD_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
});

test('a company at par is worth the benchmark', () => {
  const estimate = scorecard(50_000_000, parFactors);
  assert.equal(Math.round(estimate.value), 50_000_000);
});

test('strength above par raises the valuation proportionally', () => {
  const estimate = scorecard(50_000_000, { ...parFactors, team: 2 });
  // team carries 30% weight, so +1.0 on team is +0.30 on the multiplier.
  assert.equal(Math.round(estimate.value), 65_000_000);
});

test('implausible scoring is marked weak rather than silently trusted', () => {
  const estimate = scorecard(50_000_000, { ...parFactors, market: 10 });
  assert.equal(estimate.applicability, 'WEAK');
  assert.ok(estimate.caveats.some((c) => /scoring error/i.test(c)));
});

test('Scorecard refuses a non-positive benchmark', () => {
  assert.throws(() => scorecard(0, parFactors), NotApplicableError);
});

/* --------------------------------------------------------------- VC method */

test('the VC method divides exit value by the required return', () => {
  const estimate = vcMethod({
    forecastExitMetric: 100_000_000, exitMultiple: 5, requiredReturn: 10, dilutionBeforeExit: 0,
  });
  assert.equal(estimate.value, 50_000_000);
  assert.equal(estimate.basis, 'POST_MONEY');
});

test('future dilution reduces what todays round can support', () => {
  const estimate = vcMethod({
    forecastExitMetric: 100_000_000, exitMultiple: 5, requiredReturn: 10, dilutionBeforeExit: 0.4,
  });
  assert.equal(estimate.value, 30_000_000);
});

test('the VC method is never the primary anchor', () => {
  const estimate = vcMethod({
    forecastExitMetric: 100_000_000, exitMultiple: 5, requiredReturn: 10, dilutionBeforeExit: 0.2,
  });
  assert.equal(estimate.applicability, 'SUPPORTING');
  assert.ok(estimate.caveats.some((c) => /fund mathematics/i.test(c)));
});

test('the VC method refuses impossible dilution', () => {
  assert.throws(() => vcMethod({
    forecastExitMetric: 100_000_000, exitMultiple: 5, requiredReturn: 10, dilutionBeforeExit: 1,
  }), NotApplicableError);
});

/* -------------------------------------------------------- Revenue multiple */

test('a revenue multiple multiplies revenue', () => {
  const estimate = revenueMultiple(20_000_000, 6);
  assert.equal(estimate.value, 120_000_000);
  assert.equal(estimate.applicability, 'PRIMARY');
});

test('a revenue multiple refuses pre-revenue companies', () => {
  assert.throws(() => revenueMultiple(0, 6), NotApplicableError);
});

test('thin revenue makes the multiple weak, not wrong', () => {
  const estimate = revenueMultiple(200_000, 6);
  assert.equal(estimate.applicability, 'WEAK');
  assert.ok(estimate.caveats.some((c) => /too thin/i.test(c)));
});

test('slow growth demotes a venture revenue multiple', () => {
  const estimate = revenueMultiple(20_000_000, 6, { growthRate: 0.05 });
  assert.equal(estimate.applicability, 'SUPPORTING');
});

/* ------------------------------------------------------------ Triangulation */

test('triangulation refuses to work from a single method', () => {
  assert.throws(
    () => triangulate([berkus(perfectBerkus)]),
    InsufficientMethodsError,
  );
  assert.equal(MINIMUM_METHODS, 2);
});

test('methods measuring different things are never blended', () => {
  const result = triangulate([
    berkus(perfectBerkus, 4_000_000),                    // PRE_MONEY  20,000,000
    scorecard(20_000_000, parFactors),                   // PRE_MONEY  20,000,000
    revenueMultiple(20_000_000, 6),                      // ENTERPRISE 120,000,000
  ]);

  assert.equal(result.ranges.length, 2);
  const preMoney = result.ranges.find((r) => r.basis === 'PRE_MONEY');
  assert.equal(preMoney?.low, 20_000_000);
  assert.equal(preMoney?.high, 20_000_000);
  assert.ok(result.caveats.some((c) => /must not be averaged/i.test(c)));
});

test('agreement across methods is reported as defensible', () => {
  const result = triangulate([
    scorecard(20_000_000, parFactors),
    berkus({ ...perfectBerkus, productRollout: 0.9 }, 4_000_000),
  ]);
  assert.equal(result.isDefensible, true);
  assert.match(result.narrative, /defensible position/);
});

test('wide disagreement is the finding, not an error', () => {
  const result = triangulate([
    scorecard(5_000_000, parFactors),      // 5,000,000
    berkus(perfectBerkus, 20_000_000),     // 100,000,000 -> 20x spread
  ]);
  assert.equal(result.isDefensible, false);
  assert.match(result.narrative, /not yet a defensible valuation/);
});

test('the weighted centre respects applicability', () => {
  const primary: ValuationEstimate = {
    method: 'SCORECARD', basis: 'PRE_MONEY', value: 10_000_000,
    applicability: 'PRIMARY', applicabilityReason: '', formula: '', caveats: [],
  };
  const weak: ValuationEstimate = { ...primary, method: 'BERKUS', value: 20_000_000, applicability: 'WEAK' };

  const [range] = triangulate([primary, weak]).ranges;
  // Weighted: (10m*1.0 + 20m*0.2) / 1.2 = 11.67m. Median is the midpoint, 15m.
  assert.ok(range!.central < range!.median, 'weighting should pull toward the primary method');
  assert.equal(range!.median, 15_000_000);
});

test('every estimate caveat survives into the triangulation', () => {
  const result = triangulate([berkus(perfectBerkus), scorecard(20_000_000, parFactors)]);
  assert.ok(result.caveats.length >= 3);
  assert.ok(result.caveats.some((c) => /market convention/i.test(c)));
});
