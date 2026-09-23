import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkConsistency,
  checkDuplicateFigures,
  checkImpliedCac,
  checkRunwayClaim,
  checkUnitEconomics,
} from './checker.ts';
import { CRITICAL_GAP, ROUNDING_TOLERANCE, type Claim } from './types.ts';

const deck = (field: string, value: number, location = 'Slide 15'): Claim =>
  ({ module: 'Pitch deck', field, value, location });
const model = (field: string, value: number): Claim =>
  ({ module: 'Financial model', field, value, location: 'FY31 column' });

/* ------------------------------------------------------ duplicate figures */

test('identical figures across modules are consistent', () => {
  const violations = checkDuplicateFigures([deck('fy31Revenue', 1_000_000_000), model('fy31Revenue', 1_000_000_000)]);
  assert.deepEqual(violations, []);
});

test('the playbook case is caught: deck 100 Cr, model 82 Cr', () => {
  const [violation] = checkDuplicateFigures([
    deck('fy31Revenue', 1_000_000_000),
    model('fy31Revenue', 820_000_000),
  ]);
  assert.equal(violation?.severity, 'CRITICAL');
  assert.match(violation!.detail, /same figure and must be identical/);
  assert.equal(violation!.claims.length, 2);
});

test('rounding is not a contradiction', () => {
  const violations = checkDuplicateFigures([deck('mrr', 824_000), model('mrr', 820_000)]);
  assert.deepEqual(violations, []);
});

test('a small but real gap is a warning, not critical', () => {
  // 5% apart: past rounding tolerance, under the critical gap.
  const [violation] = checkDuplicateFigures([deck('mrr', 1_000_000), model('mrr', 950_000)]);
  assert.equal(violation?.severity, 'WARNING');
  assert.ok(ROUNDING_TOLERANCE < 0.05 && 0.05 <= CRITICAL_GAP);
});

test('a figure only one module claims is not compared', () => {
  assert.deepEqual(checkDuplicateFigures([deck('mrr', 500_000)]), []);
});

test('three disagreeing modules report against a common reference', () => {
  const violations = checkDuplicateFigures([
    model('mrr', 1_000_000),
    deck('mrr', 500_000),
    { module: 'Information memorandum', field: 'mrr', value: 300_000 },
  ]);
  assert.equal(violations.length, 2);
  assert.ok(violations.every((v) => v.claims[0]?.module === 'Financial model'));
});

test('the location travels into the message so the founder can navigate', () => {
  const [violation] = checkDuplicateFigures([deck('mrr', 1_000_000), model('mrr', 500_000)]);
  assert.match(violation!.detail, /Slide 15/);
  assert.match(violation!.detail, /FY31 column/);
});

/* ----------------------------------------------------------- implied CAC */

test('a stated CAC that the spend produces is consistent', () => {
  const violations = checkImpliedCac({
    marketingSpend: model('marketingSpend', 1_000_000),
    newCustomers: model('newCustomers', 100),
    statedCac: deck('cac', 10_000),
  });
  assert.deepEqual(violations, []);
});

test('a stated CAC the spend cannot produce is caught', () => {
  const [violation] = checkImpliedCac({
    marketingSpend: model('marketingSpend', 1_000_000),
    newCustomers: model('newCustomers', 100),
    statedCac: deck('cac', 4_000),
  });
  assert.equal(violation?.severity, 'CRITICAL');
  assert.match(violation!.detail, /implies a CAC of 10,000/);
  assert.match(violation!.suggestedFix, /divide these two numbers themselves/);
});

test('implied CAC stays quiet when an input is missing', () => {
  assert.deepEqual(checkImpliedCac({ statedCac: deck('cac', 4_000) }), []);
});

test('implied CAC does not divide by zero customers', () => {
  assert.deepEqual(checkImpliedCac({
    marketingSpend: model('marketingSpend', 1_000_000),
    newCustomers: model('newCustomers', 0),
    statedCac: deck('cac', 4_000),
  }), []);
});

/* --------------------------------------------------------------- runway */

test('a runway claim the cash supports is consistent', () => {
  const violations = checkRunwayClaim({
    cashBalance: model('cash', 12_000_000),
    monthlyBurn: model('burn', 1_000_000),
    statedRunway: deck('runwayMonths', 12),
  });
  assert.deepEqual(violations, []);
});

test('overstated runway is critical even at a small gap', () => {
  // 12 months real, 13 claimed: an 7.7% gap, under the critical threshold,
  // but overstating runway is treated as critical regardless.
  const [violation] = checkRunwayClaim({
    cashBalance: model('cash', 12_000_000),
    monthlyBurn: model('burn', 1_000_000),
    statedRunway: deck('runwayMonths', 13),
  });
  assert.equal(violation?.severity, 'CRITICAL');
  assert.match(violation!.summary, /longer than the cash and burn support/);
  assert.match(violation!.suggestedFix, /fails in diligence/);
});

test('understated runway is reported but not treated as critical at a small gap', () => {
  const [violation] = checkRunwayClaim({
    cashBalance: model('cash', 12_000_000),
    monthlyBurn: model('burn', 1_000_000),
    statedRunway: deck('runwayMonths', 11.5),
  });
  assert.equal(violation?.severity, 'WARNING');
});

test('runway does not divide by zero burn', () => {
  assert.deepEqual(checkRunwayClaim({
    cashBalance: model('cash', 12_000_000),
    monthlyBurn: model('burn', 0),
    statedRunway: deck('runwayMonths', 12),
  }), []);
});

/* -------------------------------------------------------- unit economics */

test('LTV below CAC is critical', () => {
  const [violation] = checkUnitEconomics({
    ltv: model('ltv', 8_000),
    statedCac: deck('cac', 12_000),
  });
  assert.equal(violation?.severity, 'CRITICAL');
  assert.match(violation!.detail, /loses money/);
  assert.match(violation!.suggestedFix, /not a presentation problem/);
});

test('LTV above CAC is fine', () => {
  assert.deepEqual(checkUnitEconomics({
    ltv: model('ltv', 40_000),
    statedCac: deck('cac', 10_000),
  }), []);
});

/* ---------------------------------------------------------------- report */

test('a clean package reports as consistent', () => {
  const report = checkConsistency({ claims: [deck('mrr', 500_000), model('mrr', 500_000)] });
  assert.equal(report.isConsistent, true);
  assert.deepEqual(report.criticalSummaries, []);
});

test('the report splits critical from warning', () => {
  const report = checkConsistency({
    claims: [deck('mrr', 1_000_000), model('mrr', 950_000)],   // warning
    ltv: model('ltv', 8_000),
    statedCac: deck('cac', 12_000),                            // critical
  });
  assert.equal(report.critical.length, 1);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.isConsistent, false);
});

test('critical summaries are exactly what the readiness ceiling consumes', () => {
  const report = checkConsistency({
    claims: [deck('fy31Revenue', 1_000_000_000), model('fy31Revenue', 820_000_000)],
  });
  assert.equal(report.criticalSummaries.length, 1);
  assert.equal(report.criticalSummaries[0], report.critical[0]?.summary);
});

test('an empty input set is consistent rather than an error', () => {
  const report = checkConsistency({});
  assert.equal(report.isConsistent, true);
  assert.deepEqual(report.violations, []);
});
