/**
 * India macro and archetype guardrails, as data rather than prose.
 *
 * These rules currently live inside the Gemini prompt in `financeAnalyst.ts`,
 * written as instructions: "ABSOLUTE FLOOR IS 2.00%", "Absolute ceiling is 96%".
 * Two problems follow from keeping them there, and both are real today:
 *
 * 1.  **Nothing enforces them.** The prompt asks; the parser trusts. A model at
 *     temperature 0.15 usually complies, and the one time it does not, a 40%
 *     MoM growth rate flows into the Excel model and out to a founder as an
 *     institutional-grade projection.
 *
 * 2.  **They cannot be tested or reviewed.** A domain expert cannot check EPF
 *     burden or RBI inflation bands by reading a template literal, and a change
 *     to them is invisible in a diff full of prompt wording.
 *
 * So they are declared here once, and used twice: to generate the prompt text,
 * and to check what comes back. The two cannot drift, because they are the same
 * data.
 *
 * Only rules the existing prompt states explicitly are encoded. Where the prompt
 * gives a target rather than a limit ("Base is 12%"), that is recorded as
 * guidance for the prompt and deliberately not enforced — inventing a bound the
 * domain never claimed would be the same error in the other direction.
 */

export type Archetype = 'SAAS' | 'MANUFACTURING' | 'SERVICES';

export type ScenarioName = 'Worst' | 'Base' | 'Best';

export const SCENARIOS: readonly ScenarioName[] = ['Worst', 'Base', 'Best'];

/** An enforced limit on one driver, optionally only in one scenario. */
export interface Bound {
  /** Inclusive lower limit. */
  readonly min?: number;
  /** Inclusive upper limit. */
  readonly max?: number;
  /** When absent, the bound applies to every scenario. */
  readonly scenario?: ScenarioName;
  /** Why this limit exists, in the prompt and in a violation message. */
  readonly because: string;
}

export interface DriverRule {
  /** Matches the key in `ScenarioMetricsSchema`. */
  readonly driver: string;
  /** What this driver means for this archetype, in the founder's terms. */
  readonly meaning: string;
  /** Enforced limits. */
  readonly bounds: readonly Bound[];
  /** Targets stated to the model but never enforced. */
  readonly guidance?: string;
}

export interface GuardrailSet {
  readonly title: string;
  readonly rules: readonly DriverRule[];
}

/** Corporate tax is written directly into the workbook, not asked of the model. */
export const CORPORATE_TAX_RATE = 0.25;
