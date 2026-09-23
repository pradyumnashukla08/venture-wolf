/**
 * Applying the guard to what the AI services actually return.
 *
 * `evaluateStartup`, `startInvestorQA` and `evaluateInvestorVerdict` all return
 * JSON mixing two kinds of content, and the two need opposite treatment:
 *
 * **Scores** (`overall_score`, `clarity_score`, `vector_scores`) are the
 * model's assessment. They are not measurements, so under the Provenance Law
 * they are ASSUMPTIONs — but blocking them would leave the product with nothing
 * to say. They are tagged, not rejected.
 *
 * **Prose** (`red_flags`, `stage_advice`, `question`, verdict text) is where an
 * invented figure reaches a founder styled as fact. This is guarded against the
 * :class:`FactRegistry` built from the founder's own documents: quoting their
 * numbers back at them is the job, inventing new ones is the failure.
 *
 * Rollout
 * -------
 * `GUARD_MODE=report` (the default) attaches findings and logs them without
 * changing the response, so the guard can be measured against real traffic
 * before it is allowed to reject anything. `GUARD_MODE=enforce` strips the
 * offending prose. Defaulting to `enforce` would have meant shipping a change
 * that could silently empty a founder's evaluation the first time the registry
 * was imperfect.
 */

import { FactRegistry } from './factRegistry.ts';

export type GuardMode = 'report' | 'enforce';

export function currentMode(): GuardMode {
  return process.env.GUARD_MODE === 'enforce' ? 'enforce' : 'report';
}

export interface ProseFinding {
  /** Dotted path to the offending field, e.g. `red_flags.2`. */
  readonly path: string;
  /** Numbers in that field the founder never supplied. */
  readonly unsupported: readonly number[];
  readonly text: string;
}

export interface GuardReport {
  readonly mode: GuardMode;
  readonly checked: number;
  readonly findings: readonly ProseFinding[];
  /** How many founder-supplied numbers the registry knew about. */
  readonly registrySize: number;
}

/** Field names whose values are the model's assessment, not a claim of fact. */
const SCORE_KEY = /_score$|^score$|scores$/i;

const REPLACEMENT =
  '[A figure here could not be traced to your documents and was withheld.]';

/**
 * Walk a response, guarding prose and leaving scores alone.
 *
 * Returns a possibly-rewritten copy plus the report. The input is never
 * mutated: the caller still needs the original to log what the model said.
 */
export function guardResponse<T>(
  payload: T,
  registry: FactRegistry,
  mode: GuardMode = currentMode(),
): { readonly value: T; readonly report: GuardReport } {
  const findings: ProseFinding[] = [];
  let checked = 0;

  const walk = (node: unknown, path: string, underScoreKey: boolean): unknown => {
    if (typeof node === 'string') {
      if (underScoreKey) return node;
      checked += 1;
      const unsupported = registry.unsupported(node);
      if (unsupported.length === 0) return node;

      findings.push({ path, unsupported, text: node });
      return mode === 'enforce' ? REPLACEMENT : node;
    }

    if (Array.isArray(node)) {
      return node.map((item, index) => walk(item, `${path}${path ? '.' : ''}${index}`, underScoreKey));
    }

    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        out[key] = walk(value, `${path}${path ? '.' : ''}${key}`, underScoreKey || SCORE_KEY.test(key));
      }
      return out;
    }

    return node;
  };

  const value = walk(payload, '', false) as T;

  return {
    value,
    report: { mode, checked, findings, registrySize: registry.size },
  };
}

/** One line per violation, so this is visible in logs from day one. */
export function logReport(label: string, report: GuardReport): void {
  if (report.findings.length === 0) return;
  console.warn(
    `[provenance] ${label}: ${report.findings.length} of ${report.checked} prose fields ` +
    `contain figures absent from the founder's documents (mode=${report.mode}, ` +
    `registry=${report.registrySize} numbers).`,
  );
  for (const finding of report.findings) {
    console.warn(`[provenance]   ${finding.path}: ${finding.unsupported.join(', ')}`);
  }
}
