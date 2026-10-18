/**
 * Using the guardrails twice: to state them, and to check them.
 *
 * `renderGuardrails` produces the prompt text. `enforceGuardrails` checks what
 * came back. Both read the same declarations, so the rule a model was given and
 * the rule it is held to cannot disagree.
 */

import { ARCHETYPE_GUARDRAILS, MACRO_GUARDRAILS } from './guardrails.ts';
import {
  SCENARIOS,
  type Archetype,
  type Bound,
  type DriverRule,
  type GuardrailSet,
  type ScenarioName,
} from './types.ts';

function describeBound(bound: Bound): string {
  const scope = bound.scenario ? `${bound.scenario} case only: ` : '';
  if (bound.min !== undefined && bound.max !== undefined) {
    return `${scope}must be between ${bound.min} and ${bound.max}. ${bound.because}`;
  }
  if (bound.min !== undefined) return `${scope}floor is ${bound.min}. ${bound.because}`;
  if (bound.max !== undefined) return `${scope}ceiling is ${bound.max}. ${bound.because}`;
  return `${scope}${bound.because}`;
}

function renderSet(set: GuardrailSet): string {
  const lines = [`--- ${set.title.toUpperCase()} ---`];
  for (const rule of set.rules) {
    lines.push(`- ${rule.driver} (${rule.meaning})`);
    for (const bound of rule.bounds) lines.push(`    * ${describeBound(bound)}`);
    if (rule.guidance) lines.push(`    * Guidance (not a hard limit): ${rule.guidance}`);
  }
  return lines.join('\n');
}

/** The guardrail section of the prompt, generated from the declarations. */
export function renderGuardrails(archetype: Archetype): string {
  return `${renderSet(MACRO_GUARDRAILS)}\n\n${renderSet(ARCHETYPE_GUARDRAILS[archetype])}`;
}

export interface Correction {
  readonly scenario: ScenarioName;
  readonly driver: string;
  readonly proposed: number;
  readonly corrected: number;
  readonly because: string;
}

function rulesFor(archetype: Archetype): DriverRule[] {
  return [...MACRO_GUARDRAILS.rules, ...ARCHETYPE_GUARDRAILS[archetype].rules];
}

function appliesTo(bound: Bound, scenario: ScenarioName): boolean {
  return bound.scenario === undefined || bound.scenario === scenario;
}

/**
 * Bring a model's proposed assumptions inside the guardrails.
 *
 * Corrects rather than refuses, for a specific reason. A refusal here would
 * surface to the founder as "forecast failed" on a run that is otherwise
 * entirely usable — the model was right about fourteen drivers and wrong about
 * one. Clamping keeps the forecast and records the disagreement, and the
 * corrections are returned so they can be shown rather than hidden: a driver
 * the system had to overrule is exactly the kind of thing a founder should see
 * before quoting these numbers to an investor.
 *
 * The input is not mutated.
 */
export function enforceGuardrails<T extends Record<string, Record<string, number>>>(
  assumptions: T,
  archetype: Archetype,
): { readonly assumptions: T; readonly corrections: readonly Correction[] } {
  const rules = rulesFor(archetype);
  const corrections: Correction[] = [];
  const out: Record<string, Record<string, number>> = {};

  for (const scenario of SCENARIOS) {
    const proposed = assumptions[scenario];
    if (!proposed) continue;

    const corrected: Record<string, number> = { ...proposed };

    for (const rule of rules) {
      const value = corrected[rule.driver];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;

      for (const bound of rule.bounds) {
        if (!appliesTo(bound, scenario)) continue;

        let next = value;
        if (bound.min !== undefined && next < bound.min) next = bound.min;
        if (bound.max !== undefined && next > bound.max) next = bound.max;

        if (next !== corrected[rule.driver]) {
          corrections.push({
            scenario,
            driver: rule.driver,
            proposed: corrected[rule.driver]!,
            corrected: next,
            because: bound.because,
          });
          corrected[rule.driver] = next;
        }
      }
    }

    out[scenario] = corrected;
  }

  return { assumptions: { ...assumptions, ...out } as T, corrections };
}
