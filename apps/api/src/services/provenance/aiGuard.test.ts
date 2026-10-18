import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FactRegistry } from './factRegistry.ts';
import { guardResponse } from './aiGuard.ts';

const deck = 'MRR is 500000. Burn is 250000. Churn 5%.';

test('prose quoting the founder figures passes clean', () => {
  const registry = new FactRegistry().ingest(deck);
  const { report } = guardResponse(
    { stage_advice: 'Your MRR of 500000 against 250000 burn is tight.' },
    registry,
  );
  assert.deepEqual(report.findings, []);
});

test('an invented figure in prose is reported', () => {
  const registry = new FactRegistry().ingest(deck);
  const { report } = guardResponse(
    { stage_advice: 'Your CAC of 4000 is unsustainable.' },
    registry,
  );
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0]?.path, 'stage_advice');
  assert.deepEqual(report.findings[0]?.unsupported, [4000]);
});

test('report mode leaves the response untouched', () => {
  const registry = new FactRegistry().ingest(deck);
  const payload = { stage_advice: 'Your CAC of 4000 is unsustainable.' };
  const { value } = guardResponse(payload, registry, 'report');
  assert.equal(value.stage_advice, payload.stage_advice);
});

test('enforce mode withholds the offending prose', () => {
  const registry = new FactRegistry().ingest(deck);
  const { value } = guardResponse(
    { stage_advice: 'Your CAC of 4000 is unsustainable.' },
    registry,
    'enforce',
  );
  assert.match(value.stage_advice, /could not be traced/);
});

test('scores are never touched, in either mode', () => {
  const registry = new FactRegistry();
  const payload = {
    overall_score: 73,
    vector_scores: { delivery_score: 41, note: 'steady at 41 out of 100' },
  };
  const { value, report } = guardResponse(payload, registry, 'enforce');
  assert.equal(value.overall_score, 73);
  assert.equal(value.vector_scores.note, 'steady at 41 out of 100');
  assert.deepEqual(report.findings, []);
});

test('nested arrays are walked and paths are reported', () => {
  const registry = new FactRegistry().ingest(deck);
  const { report } = guardResponse(
    { red_flags: ['Burn of 250000 is high.', 'Runway of 3 months at 990000 spend.'] },
    registry,
    'report',
  );
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0]?.path, 'red_flags.1');
});

test('the response shape is preserved', () => {
  const registry = new FactRegistry().ingest(deck);
  const payload = {
    clarity_score: 60,
    fundability_verdict: 'Promising but Needs Metric Refinements',
    rounds: [{ questions: [{ question: 'What is your MRR of 500000 built on?' }] }],
  };
  const { value } = guardResponse(payload, registry, 'enforce');
  assert.deepEqual(value, payload);
});
