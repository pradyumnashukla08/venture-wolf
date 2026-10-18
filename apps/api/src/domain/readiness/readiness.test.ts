import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreReadiness,
  MODULE_LABELS,
  MODULE_WEIGHTS,
  CRITICAL_CONTRADICTION_CEILING,
  UNREVIEWED_ASSUMPTION_CEILING,
  type ModuleKey,
  type ModuleScoreInput,
} from './readiness.ts';

const ALL_KEYS = Object.keys(MODULE_LABELS) as ModuleKey[];

/** Every module at a given completion and quality, so tests isolate one effect. */
function everyModule(completion: number, quality: number): ModuleScoreInput[] {
  return ALL_KEYS.map((key) => ({ key, completion, quality }));
}

test('the weights sum to 100', () => {
  const total = Object.values(MODULE_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
});

test('every module has a weight', () => {
  for (const key of ALL_KEYS) {
    assert.ok(MODULE_WEIGHTS[key] > 0, `${key} has no weight`);
  }
});

test('a complete, flawless package scores 100', () => {
  const readiness = scoreReadiness({ modules: everyModule(100, 100) });
  assert.equal(readiness.score, 100);
});

test('an empty package scores 0 and says so', () => {
  const readiness = scoreReadiness({ modules: [] });
  assert.equal(readiness.score, 0);
  assert.equal(readiness.modules.length, ALL_KEYS.length);
  assert.ok(readiness.modules.every((m) => m.notes.includes('Not started.')));
});

test('completion and quality multiply rather than average', () => {
  // Half built, flawless content. Averaging would give 75; the truth is 50.
  const readiness = scoreReadiness({ modules: everyModule(50, 100) });
  assert.equal(readiness.score, 50);
});

test('an unscored module is missing, not neutral', () => {
  const readiness = scoreReadiness({
    modules: [{ key: 'financialModel', completion: 100, quality: 100 }],
  });
  // Only the financial model contributes, at its own weight.
  assert.equal(readiness.score, MODULE_WEIGHTS.financialModel);
});

test('a critical contradiction caps the score however complete the package', () => {
  const readiness = scoreReadiness({
    modules: everyModule(100, 100),
    criticalContradictions: ['Deck says 40% margin; model says 22%.'],
  });
  assert.equal(readiness.score, CRITICAL_CONTRADICTION_CEILING);
  assert.equal(readiness.rawScore, 100);
  assert.match(readiness.nextAction, /contradicts itself/);
});

test('unreviewed assumptions cap the score below the polished band', () => {
  const readiness = scoreReadiness({
    modules: everyModule(100, 100),
    unreviewedAssumptions: ['vc_method.required_return'],
  });
  assert.equal(readiness.score, UNREVIEWED_ASSUMPTION_CEILING);
  assert.match(readiness.nextAction, /investor can challenge/);
});

test('a ceiling never raises a score that was already lower', () => {
  const readiness = scoreReadiness({
    modules: everyModule(20, 50),
    criticalContradictions: ['Contradiction.'],
  });
  assert.equal(readiness.score, 10);
});

test('the contradiction ceiling takes precedence in the next action', () => {
  const readiness = scoreReadiness({
    modules: everyModule(100, 100),
    criticalContradictions: ['Deck and model disagree.'],
    unreviewedAssumptions: ['a.b'],
  });
  assert.equal(readiness.ceilingsApplied.length, 2);
  assert.match(readiness.nextAction, /contradicts itself/);
});

test('long assumption lists are elided rather than dumped', () => {
  const readiness = scoreReadiness({
    modules: everyModule(100, 100),
    unreviewedAssumptions: ['a.one', 'b.two', 'c.three', 'd.four', 'e.five'],
  });
  assert.match(readiness.nextAction, /\.\.\./);
  assert.match(readiness.nextAction, /5 assumptions/);
});

test('duplicate assumption ids are counted once', () => {
  const readiness = scoreReadiness({
    modules: everyModule(100, 100),
    unreviewedAssumptions: ['a.one', 'a.one', 'a.one'],
  });
  assert.match(readiness.nextAction, /1 assumption /);
});

test('the weakest module is weighted by importance, not just lowest', () => {
  const modules = everyModule(100, 100).map((module) =>
    module.key === 'financialModel'
      ? { ...module, completion: 60, quality: 100 }   // gap 40 x weight 15 = 600
      : module.key === 'conceptNote'
        ? { ...module, completion: 0, quality: 0 }     // gap 100 x weight 4 = 400
        : module,
  );

  const readiness = scoreReadiness({ modules });
  assert.equal(readiness.weakest?.key, 'financialModel');
});

test('the next action names the weakest module and its first note', () => {
  const modules = everyModule(100, 100).map((module) =>
    module.key === 'pitchDeck'
      ? { ...module, completion: 30, quality: 50, notes: ['Six slides contradict the model.'] }
      : module,
  );

  const readiness = scoreReadiness({ modules });
  assert.match(readiness.nextAction, /pitch deck/i);
  assert.match(readiness.nextAction, /Six slides contradict the model\./);
});

test('a polished package is told to rehearse, not prepare', () => {
  const readiness = scoreReadiness({ modules: everyModule(100, 99) });
  assert.match(readiness.nextAction, /rehearsal, not preparation/);
});

test('weak modules are listed worst first', () => {
  const modules = everyModule(100, 100).map((module) =>
    module.key === 'gtm' ? { ...module, completion: 50, quality: 40 }
      : module.key === 'dataRoom' ? { ...module, completion: 20, quality: 50 }
        : module,
  );

  const readiness = scoreReadiness({ modules });
  assert.deepEqual(readiness.weakModules.map((m) => m.key), ['dataRoom', 'gtm']);
});

test('scoring the same module twice is refused', () => {
  assert.throws(
    () => scoreReadiness({
      modules: [
        { key: 'valuation', completion: 10, quality: 10 },
        { key: 'valuation', completion: 90, quality: 90 },
      ],
    }),
    /scored more than once/,
  );
});

test('an out-of-range percentage is refused rather than clamped', () => {
  assert.throws(
    () => scoreReadiness({ modules: [{ key: 'valuation', completion: 120, quality: 50 }] }),
    RangeError,
  );
});

test('an unknown module is refused', () => {
  assert.throws(
    () => scoreReadiness({ modules: [{ key: 'nonsense' as ModuleKey, completion: 1, quality: 1 }] }),
    /Unknown module/,
  );
});

test('the caveat always travels with the score', () => {
  const readiness = scoreReadiness({ modules: everyModule(100, 100) });
  assert.match(readiness.caveat, /directional/);
  assert.match(readiness.caveat, /does not predict an outcome/);
});
