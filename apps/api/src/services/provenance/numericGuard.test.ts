/**
 * The first tests in this repository.
 *
 * Run with Node's built-in runner, which needs no dependencies installed:
 *
 *     node --test backend/src/services/provenance/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { guard, render, extractTokens } from './numericGuard.ts';
import {
  Provenance, assumption, calc, fact, restsOnAssumption, assumptionsUnder,
} from './types.ts';

test('prose built only from tokens passes', () => {
  const text = 'Your runway is {{metric:runway_months}} months at the current burn.';
  const result = guard(text, ['runway_months']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('a digit written outside a token is caught', () => {
  const result = guard('Your runway is 7 months.', ['runway_months']);
  assert.equal(result.ok, false);
  assert.equal(result.violations[0]?.kind, 'bare-number');
});

test('a number spelled as a word is caught', () => {
  const result = guard('We project three crore in year two.', []);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'number-word'));
});

test('Devanagari digits are caught', () => {
  const result = guard('राजस्व ७ लाख', []);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'bare-number'));
});

test('a token the system never decided is rejected', () => {
  const result = guard('Churn is {{metric:invented_metric}}.', ['runway_months']);
  assert.equal(result.ok, false);
  assert.equal(result.violations[0]?.kind, 'unknown-token');
});

test('digits inside a token id do not count as bare numbers', () => {
  const result = guard('Year {{metric:year_5_revenue}} looks strong.', ['year_5_revenue']);
  assert.equal(result.ok, true);
});

test('extractTokens reports namespace and id', () => {
  const [token] = extractTokens('{{item:cac_payback}}');
  assert.equal(token?.namespace, 'item');
  assert.equal(token?.id, 'cac_payback');
});

test('render binds decided values', () => {
  const out = render(
    'Runway is {{metric:runway_months}} months.',
    new Map([['runway_months', '7']]),
  );
  assert.equal(out, 'Runway is 7 months.');
});

test('render refuses an unbound token rather than emitting a gap', () => {
  assert.throws(
    () => render('Runway is {{metric:runway_months}}.', new Map()),
    /no value was decided/,
  );
});

test('an AI-proposed valuation is an ASSUMPTION, never a FACT', () => {
  const valuation = assumption(100_000_000, {
    key: 'ai.market_assumptions.estimatedValuation',
    origin: 'llm',
    rationale: 'Proposed by the forecast model from the founder profile.',
  });
  assert.equal(valuation.provenance, Provenance.ASSUMPTION);
  assert.equal(restsOnAssumption(valuation), true);
});

test('a computation over an assumption still rests on it', () => {
  const mrr = fact(500_000, 'founder');
  const churn = assumption(0.05, {
    key: 'ai.market_assumptions.churn',
    origin: 'llm',
    rationale: 'Base case churn for SAAS archetype.',
  });
  const ltv = calc(10_000_000, 'mrr / churn', [mrr, churn]);

  assert.equal(restsOnAssumption(ltv), true);
  assert.deepEqual(assumptionsUnder(ltv).map((a) => a.key), ['ai.market_assumptions.churn']);
});

test('a computation over facts alone does not', () => {
  const revenue = calc(120, 'mrr * 12', [fact(10, 'founder')]);
  assert.equal(restsOnAssumption(revenue), false);
  assert.deepEqual(assumptionsUnder(revenue), []);
});
