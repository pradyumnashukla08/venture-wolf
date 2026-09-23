import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assessValuation, auditProposedValuation } from './assess.ts';

const berkusScores = {
  soundIdea: 1, prototype: 0.8, qualityTeam: 1, strategicRelationships: 0.5, productRollout: 0.4,
};
const scorecardFactors = {
  team: 1.2, market: 1, product: 1, competition: 0.9, traction: 0.8, fundingNeed: 1,
};

test('with no inputs at all it refuses and names what is missing', () => {
  const assessment = assessValuation({});
  assert.equal(assessment.kind, 'insufficient');
  if (assessment.kind !== 'insufficient') return;

  assert.deepEqual(assessment.ran, []);
  assert.equal(assessment.missing.length, 4);
  assert.ok(assessment.missing.every((m) => m.unlocks.length > 0));
});

test('one method alone is still a refusal', () => {
  const assessment = assessValuation({ berkusScores });
  assert.equal(assessment.kind, 'insufficient');
  if (assessment.kind !== 'insufficient') return;
  assert.deepEqual(assessment.ran, ['BERKUS']);
  assert.match(assessment.reason, /at least 2/);
});

test('two methods triangulate, and the gaps are still reported', () => {
  const assessment = assessValuation({
    berkusScores,
    benchmarkValuation: 20_000_000,
    scorecardFactors,
  });
  assert.equal(assessment.kind, 'triangulated');
  if (assessment.kind !== 'triangulated') return;

  assert.equal(assessment.result.estimates.length, 2);
  // Revenue multiple and VC method still could not run; say so.
  assert.equal(assessment.missing.length, 2);
});

test('a method whose arithmetic is undefined is reported, not thrown', () => {
  const assessment = assessValuation({
    berkusScores,
    benchmarkValuation: 20_000_000,
    scorecardFactors,
    annualRevenue: 0,
    revenueMultipleFromComparables: 6,
  });
  assert.equal(assessment.kind, 'triangulated');
  if (assessment.kind !== 'triangulated') return;
  assert.ok(assessment.missing.some((m) => /pre-revenue method/i.test(m.unlocks)));
});

test('an unverifiable proposed valuation is called unverified', () => {
  const audit = auditProposedValuation(100_000_000, assessValuation({}));
  assert.equal(audit.supported, false);
  assert.match(audit.comment, /proposed by a model, not derived/);
});

test('a proposed valuation inside the supported range is confirmed', () => {
  const assessment = assessValuation({
    berkusScores,
    benchmarkValuation: 20_000_000,
    scorecardFactors,
  });
  if (assessment.kind !== 'triangulated') throw new Error('expected triangulation');

  const inside = assessment.result.ranges[0]!.central;
  assert.equal(auditProposedValuation(inside, assessment).supported, true);
});

test('a proposed valuation far outside every range is flagged', () => {
  const assessment = assessValuation({
    berkusScores,
    benchmarkValuation: 20_000_000,
    scorecardFactors,
  });
  const audit = auditProposedValuation(50_000_000_000, assessment);
  assert.equal(audit.supported, false);
  assert.match(audit.comment, /an investor will ask/);
});
