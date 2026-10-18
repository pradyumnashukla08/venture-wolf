/**
 * The funding-readiness score.
 *
 * Ported from WaoU-Fund's `engines/scoring/readiness.py`. The product
 * specification is explicit that the score is directional:
 *
 *     The score tells the founder where the weakest module is, so the last mile
 *     of prep is targeted rather than a blind re-read of everything.
 *
 * Two design consequences follow, and both are enforced here rather than left
 * to the UI - which matters for this codebase, because `ScoreRing.tsx` already
 * exists in the app with nothing real behind it.
 *
 * **The weakest module is the headline, not the score.** A founder who reads
 * "73/100" learns nothing actionable. `nextAction` names the single thing to do
 * next, chosen by how much it would move the score.
 *
 * **Completion and quality are tracked separately, and they multiply.** A deck
 * where all eighteen slides exist but six contradict the model is not ready.
 * Averaging the two would hide exactly the problem the founder needs to see: a
 * half-built deck whose content is flawless is half ready, not three-quarters
 * ready.
 *
 * The score is also *capped*, not merely reduced, by integrity failures. A
 * package with a critical contradiction cannot show a high score however
 * complete its modules are, because it is not ready to send at any level of
 * completeness.
 */

export const MODULE_LABELS = {
  financialModel: 'Financial model',
  pitchDeck: 'Pitch deck',
  valuation: 'Valuation',
  tractionEvidence: 'Traction evidence',
  informationMemorandum: 'Information memorandum',
  gtm: 'GTM and pricing',
  dataRoom: 'Data room',
  dueDiligence: 'Due diligence readiness',
  conceptNote: 'Concept note',
  mockInterview: 'Mock interview performance',
} as const;

export type ModuleKey = keyof typeof MODULE_LABELS;

/**
 * How much each module moves the score, in percent, summing to 100.
 *
 * These weights decide which module a founder is told to fix first, so they are
 * a product judgement rather than a technical detail and **need a domain
 * review**. They are declared in one place so that review is a single diff.
 */
export const MODULE_WEIGHTS: Record<ModuleKey, number> = {
  financialModel: 15,
  pitchDeck: 15,
  tractionEvidence: 15,
  valuation: 10,
  dataRoom: 10,
  dueDiligence: 9,
  informationMemorandum: 8,
  gtm: 8,
  mockInterview: 6,
  conceptNote: 4,
};

/** A package that contradicts itself is not "nearly ready" at any completeness. */
export const CRITICAL_CONTRADICTION_CEILING = 59;

/** Assumptions the founder has never reviewed are things they will be asked about. */
export const UNREVIEWED_ASSUMPTION_CEILING = 79;

/** Below this a module is called out as worth fixing first. */
export const WEAK_MODULE_THRESHOLD = 70;

/** Above this a module needs no further work. */
export const POLISHED_MODULE_THRESHOLD = 95;

const MAX_IDS_IN_MESSAGE = 3;

export interface ModuleScoreInput {
  readonly key: ModuleKey;
  /** 0-100: how much of the module exists at all. */
  readonly completion: number;
  /** 0-100: how well what exists stands up. */
  readonly quality: number;
  readonly notes?: readonly string[];
}

export interface ModuleScore extends ModuleScoreInput {
  readonly label: string;
  readonly notes: readonly string[];
  /** completion x quality, on a 0-100 scale. */
  readonly combined: number;
}

export interface ReadinessInput {
  readonly modules: readonly ModuleScoreInput[];
  /** Contradictions serious enough to cap the score. */
  readonly criticalContradictions?: readonly string[];
  /** Ids of assumptions the founder has not reviewed. */
  readonly unreviewedAssumptions?: readonly string[];
}

export interface Readiness {
  readonly score: number;
  /** Before any integrity ceiling was applied. */
  readonly rawScore: number;
  readonly modules: readonly ModuleScore[];
  readonly weakest: ModuleScore | null;
  readonly weakModules: readonly ModuleScore[];
  readonly ceilingsApplied: readonly string[];
  readonly nextAction: string;
  readonly caveat: string;
}

export const READINESS_CAVEAT =
  'This score is directional. It measures how complete and internally ' +
  'consistent the fundraising package is, not whether investors will fund the ' +
  'company. A high score means nothing is obviously missing; it does not ' +
  'predict an outcome.';

function assertPercent(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${name} must be a number between 0 and 100, got ${value}.`);
  }
}

function describe(input: ModuleScoreInput): ModuleScore {
  assertPercent(`${input.key}.completion`, input.completion);
  assertPercent(`${input.key}.quality`, input.quality);
  return {
    ...input,
    label: MODULE_LABELS[input.key],
    notes: input.notes ?? [],
    // Quality applies to what exists, so the two multiply rather than average.
    combined: (input.completion / 100) * input.quality,
  };
}

/** The one sentence a founder should act on today. */
function decideNextAction(ceilings: readonly string[], weakest: ModuleScore | null): string {
  if (ceilings.length > 0) return ceilings[0]!;
  if (weakest === null) return 'Add module scores to get a readiness assessment.';
  if (weakest.combined >= POLISHED_MODULE_THRESHOLD) {
    return 'Every module is in good shape. The remaining work is rehearsal, not preparation.';
  }
  const detail = weakest.notes[0] ? ` ${weakest.notes[0]}` : '';
  return (
    `Work on the ${weakest.label.toLowerCase()} next: it is the weakest part of ` +
    `the package relative to how much investors weigh it.${detail}`
  );
}

/**
 * Roll module scores up into one directional figure.
 *
 * A module nobody has scored is treated as absent and scores zero: an unstarted
 * module is not neutral to a fundraise, it is missing.
 */
export function scoreReadiness(input: ReadinessInput): Readiness {
  const weightTotal = Object.values(MODULE_WEIGHTS).reduce((a, b) => a + b, 0);
  if (weightTotal !== 100) {
    throw new RangeError(
      `Readiness weights must sum to 100, got ${weightTotal}. Otherwise the score ` +
      `is not on a 0-100 scale and cannot be compared over time.`,
    );
  }

  const provided = new Map<ModuleKey, ModuleScoreInput>();
  for (const module of input.modules) {
    if (!(module.key in MODULE_LABELS)) {
      throw new RangeError(`Unknown module "${module.key}".`);
    }
    if (provided.has(module.key)) {
      throw new RangeError(`Module "${module.key}" was scored more than once.`);
    }
    provided.set(module.key, module);
  }

  const modules: ModuleScore[] = (Object.keys(MODULE_LABELS) as ModuleKey[]).map((key) => {
    const supplied = provided.get(key);
    return supplied
      ? describe(supplied)
      : describe({ key, completion: 0, quality: 0, notes: ['Not started.'] });
  });

  const raw = modules.reduce(
    (total, module) => total + module.combined * (MODULE_WEIGHTS[module.key] / 100),
    0,
  );

  const ceilings: string[] = [];
  let value = raw;

  const contradictions = input.criticalContradictions ?? [];
  if (contradictions.length > 0) {
    ceilings.push(
      `Resolve the ${contradictions.length} critical contradiction` +
      `${contradictions.length === 1 ? '' : 's'} first, starting with: ` +
      `${contradictions[0]}. The package contradicts itself, which no amount of ` +
      `polish compensates for.`,
    );
    value = Math.min(value, CRITICAL_CONTRADICTION_CEILING);
  }

  const unreviewed = [...new Set(input.unreviewedAssumptions ?? [])].sort();
  if (unreviewed.length > 0) {
    const shown = unreviewed.slice(0, MAX_IDS_IN_MESSAGE).join(', ');
    const elision = unreviewed.length > MAX_IDS_IN_MESSAGE ? '...' : '';
    ceilings.push(
      `Review the ${unreviewed.length} assumption` +
      `${unreviewed.length === 1 ? '' : 's'} the numbers depend on ` +
      `(${shown}${elision}). Each one is a figure an investor can challenge and ` +
      `the founder has not yet seen.`,
    );
    value = Math.min(value, UNREVIEWED_ASSUMPTION_CEILING);
  }

  // Weighted by importance, not just lowest raw score: a mediocre financial
  // model matters more than an absent mock-interview session.
  const weakest = modules.reduce<ModuleScore | null>((worst, module) => {
    if (worst === null) return module;
    const gap = (m: ModuleScore) => (100 - m.combined) * MODULE_WEIGHTS[m.key];
    return gap(module) > gap(worst) ? module : worst;
  }, null);

  return {
    score: Math.round(value),
    rawScore: Math.round(raw),
    modules,
    weakest,
    weakModules: modules
      .filter((module) => module.combined < WEAK_MODULE_THRESHOLD)
      .sort((a, b) => a.combined - b.combined),
    ceilingsApplied: ceilings,
    nextAction: decideNextAction(ceilings, weakest),
    caveat: READINESS_CAVEAT,
  };
}
