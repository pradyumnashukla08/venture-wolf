/**
 * Which numbers the founder actually gave us.
 *
 * The numeric guard's rule — "the model may not write a number" — is too blunt
 * on its own for this product. A good investor question quotes the founder's
 * own metrics back at them ("your CAC of 4,000 against a 6-month payback"), and
 * refusing that would make the Devang persona useless.
 *
 * The distinction that matters is not *whether* a number appears, but whether
 * the founder can recognise it. A figure lifted from their own pitch deck is a
 * FACT they supplied. A figure that appears nowhere in their documents or
 * profile was invented by the model, and is exactly what the guard exists to
 * catch.
 *
 * So the registry indexes every number in the source material, and the guard
 * asks it before objecting.
 *
 * Normalisation is the whole difficulty. Indian financial prose writes the same
 * quantity as `50,00,000`, `50 lakh`, `0.5 Cr` and `₹50L`, and a registry that
 * treats those as four different numbers would reject the model for correctly
 * restating the founder's own figure in different units.
 */

/** Multipliers for the magnitude words Indian financial writing uses. */
const SCALES: ReadonlyArray<readonly [RegExp, number]> = [
  [/^(k|thousand)$/i, 1_000],
  [/^(l|lac|lacs|lakh|lakhs)$/i, 100_000],
  [/^(cr|crore|crores)$/i, 10_000_000],
  [/^(m|mn|million)$/i, 1_000_000],
  [/^(b|bn|billion)$/i, 1_000_000_000],
];

/**
 * A number, plus an optional magnitude word immediately after it.
 *
 * Handles Indian digit grouping (`50,00,000`) and Western (`5,000,000`) alike
 * by stripping commas before parsing rather than trying to match either shape.
 *
 * The magnitude alternatives are ordered longest-first and anchored with a word
 * boundary. Without both, `m` matches the start of "months" and "7 months"
 * silently becomes seven million — which reads as a fabricated metric and would
 * have the guard rejecting the model for writing a perfectly ordinary sentence.
 */
const NUMBER_IN_TEXT = /(\d[\d,]*(?:\.\d+)?)\s*(%|(?:crores|crore|cr|lakhs|lakh|lacs|lac|thousand|million|billion|mn|bn|k|l|m|b)\b)?/gi;

function applyScale(base: number, suffix: string | undefined): number {
  if (!suffix) return base;
  if (suffix === '%') return base;
  for (const [pattern, multiplier] of SCALES) {
    if (pattern.test(suffix)) return base * multiplier;
  }
  return base;
}

/**
 * Round to a tolerance so restatements match.
 *
 * "roughly 1.2 crore" and "1,20,00,000" are the same claim; "12,000,000" is
 * not. Six significant figures keeps genuine differences apart while absorbing
 * rounding in prose.
 */
function canonical(value: number): string {
  if (!Number.isFinite(value)) return 'nan';
  if (value === 0) return '0';
  return value.toPrecision(6);
}

export interface RegisteredNumber {
  readonly value: number;
  /** The text it was found in, for explaining a decision later. */
  readonly seenAs: string;
}

export class FactRegistry {
  readonly #byCanonical = new Map<string, RegisteredNumber>();

  /** Index every number appearing in a piece of founder-supplied text. */
  ingest(text: string | null | undefined): this {
    if (!text) return this;
    for (const match of text.matchAll(NUMBER_IN_TEXT)) {
      const raw = match[1]!;
      const suffix = match[2];
      const base = Number.parseFloat(raw.replace(/,/g, ''));
      if (!Number.isFinite(base)) continue;

      const scaled = applyScale(base, suffix);
      const seenAs = match[0]!.trim();

      // Register the scaled reading and the bare digits both: the founder may
      // write "5 Cr" and the model restate it as "5" in a sentence that already
      // says crore.
      for (const value of new Set([scaled, base])) {
        const key = canonical(value);
        if (!this.#byCanonical.has(key)) {
          this.#byCanonical.set(key, { value, seenAs });
        }
      }
    }
    return this;
  }

  /** Index several sources at once (profile JSON, deck text, financials). */
  ingestAll(texts: readonly (string | null | undefined)[]): this {
    texts.forEach((text) => this.ingest(text));
    return this;
  }

  /** Did the founder give us this number, in any of its written forms? */
  has(value: number): boolean {
    return this.#byCanonical.has(canonical(value));
  }

  get size(): number {
    return this.#byCanonical.size;
  }

  /**
   * Small integers are not claims.
   *
   * "the three founders", "your top 2 channels", "the first 10 customers" are
   * ordinary English, and treating them as fabricated metrics would bury a real
   * violation under noise. Years are excluded for the same reason.
   */
  static isUnremarkable(value: number): boolean {
    if (Number.isInteger(value) && value >= 0 && value <= 12) return true;
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) return true;
    return false;
  }

  /** Every number in `text` that the founder never supplied. */
  unsupported(text: string): number[] {
    const found: number[] = [];
    for (const match of text.matchAll(NUMBER_IN_TEXT)) {
      const base = Number.parseFloat(match[1]!.replace(/,/g, ''));
      if (!Number.isFinite(base)) continue;
      const scaled = applyScale(base, match[2]);

      if (FactRegistry.isUnremarkable(scaled) || FactRegistry.isUnremarkable(base)) continue;
      if (this.has(scaled) || this.has(base)) continue;
      found.push(scaled);
    }
    return found;
  }
}
