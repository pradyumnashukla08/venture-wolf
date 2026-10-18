/**
 * Provenance: where every number came from.
 *
 * Ported from the WaoU-Fund architecture (`engines/provenance/types.py`) into
 * the Venture Wolf backend, because this codebase has the opposite problem the
 * Python one was designed against: the forecast numbers a founder is shown are
 * invented by an LLM, and nothing in the response distinguishes them from a
 * figure the company actually measured.
 *
 * There are exactly four classes, and the class travels with the value:
 *
 *   FACT        The founder entered or confirmed it, or it was read out of a
 *               document they uploaded.
 *   CITE        Retrieved from an external source, with a URL and a date.
 *   CALC        Computed deterministically from other traced values. Retains
 *               the lineage of its inputs.
 *   ASSUMPTION  Nobody knows it. The model needs a value anyway (churn,
 *               inflation, discount rate). Named, bounded, and rendered
 *               distinctly.
 *
 * ASSUMPTION is a separate class rather than a flavour of FACT for one reason:
 * an investor must never be shown an assumed number styled the same way as a
 * measured one. Everything `generateMarketAssumptions` returns is an
 * ASSUMPTION, including `estimatedValuation` — especially `estimatedValuation`.
 */

export const Provenance = {
  FACT: 'FACT',
  CITE: 'CITE',
  CALC: 'CALC',
  ASSUMPTION: 'ASSUMPTION',
} as const;

export type Provenance = (typeof Provenance)[keyof typeof Provenance];

/** Where an ASSUMPTION came from, so the founder can argue with it. */
export interface AssumptionSource {
  /** Stable identifier, e.g. `ai.market_assumptions.churn`. */
  readonly key: string;
  /** Who proposed it: the model, a macro guardrail, or a product default. */
  readonly origin: 'llm' | 'guardrail' | 'default';
  /** Why this value is defensible, in one line a founder can read. */
  readonly rationale: string;
}

export interface CiteSource {
  readonly url: string;
  /** ISO-8601 date the source was retrieved. */
  readonly retrievedAt: string;
}

/** A value that knows where it came from. */
export type Traced<T> =
  | { readonly provenance: typeof Provenance.FACT; readonly value: T; readonly enteredBy: string }
  | { readonly provenance: typeof Provenance.CITE; readonly value: T; readonly source: CiteSource }
  | { readonly provenance: typeof Provenance.CALC; readonly value: T; readonly formula: string; readonly inputs: readonly Traced<unknown>[] }
  | { readonly provenance: typeof Provenance.ASSUMPTION; readonly value: T; readonly source: AssumptionSource };

export function fact<T>(value: T, enteredBy: string): Traced<T> {
  return { provenance: Provenance.FACT, value, enteredBy };
}

export function cite<T>(value: T, source: CiteSource): Traced<T> {
  return { provenance: Provenance.CITE, value, source };
}

export function calc<T>(value: T, formula: string, inputs: readonly Traced<unknown>[]): Traced<T> {
  return { provenance: Provenance.CALC, value, formula, inputs };
}

export function assumption<T>(value: T, source: AssumptionSource): Traced<T> {
  return { provenance: Provenance.ASSUMPTION, value, source };
}

/**
 * True when a value, or anything it was computed from, rests on an assumption.
 *
 * A CALC built on an assumed churn rate is not a measurement, however many
 * deterministic steps sit between the two. The UI uses this to decide whether a
 * figure may be rendered as though the company knows it.
 */
export function restsOnAssumption(traced: Traced<unknown>): boolean {
  if (traced.provenance === Provenance.ASSUMPTION) return true;
  if (traced.provenance === Provenance.CALC) return traced.inputs.some(restsOnAssumption);
  return false;
}

/** Every distinct assumption underneath a value, for the "what we assumed" panel. */
export function assumptionsUnder(traced: Traced<unknown>): AssumptionSource[] {
  const found = new Map<string, AssumptionSource>();
  const walk = (node: Traced<unknown>): void => {
    if (node.provenance === Provenance.ASSUMPTION) {
      found.set(node.source.key, node.source);
    } else if (node.provenance === Provenance.CALC) {
      node.inputs.forEach(walk);
    }
  };
  walk(traced);
  return [...found.values()];
}
