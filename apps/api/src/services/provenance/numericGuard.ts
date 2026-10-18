/**
 * The output gate: the model may phrase, it may not author numbers.
 *
 * Ported from WaoU-Fund's `engines/provenance/numeric_guard.py`. The rule it
 * enforces is the one thing standing between "an AI helped write this" and "an
 * AI made this figure up and we showed it to an investor":
 *
 *     A model never emits a number. It emits a token naming a value the system
 *     already decided, and the token is bound to that value at render time.
 *
 * So a prompt asks for `Your runway is {{metric:runway_months}} months`, never
 * `Your runway is 7 months`. This module is the mechanical check that the rule
 * held. It is deliberately dumb: strip every recognised token, then look for a
 * digit in what is left. A digit surviving that means the model wrote a number
 * in its own voice, and the response must not reach the founder.
 */

/** `{{metric:runway_months}}` / `{{item:cac_payback}}` — namespace and id. */
const TOKEN_PATTERN = /\{\{([a-z_]+):([A-Za-z0-9_.\-]+)\}\}/g;

/**
 * Digits in any script, plus the numeric forms prose hides them in:
 * `1,00,000` (Indian grouping), `1.5`, `12%`, `₹5Cr`, `3x`.
 */
const DIGIT_PATTERN = /[0-9०-९]/u;

/**
 * Number words, because "we project three crore in year two" evades a digit
 * scan while making exactly the claim the guard exists to stop.
 */
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty',
  'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million',
  'billion', 'lakh', 'lakhs', 'crore', 'crores',
];
const NUMBER_WORD_SET = new Set(NUMBER_WORDS);

export interface TokenRef {
  readonly namespace: string;
  readonly id: string;
  readonly raw: string;
}

export interface GuardViolation {
  readonly kind: 'unknown-token' | 'bare-number' | 'number-word';
  readonly detail: string;
}

export interface GuardResult {
  readonly ok: boolean;
  readonly violations: readonly GuardViolation[];
  readonly tokens: readonly TokenRef[];
}

export function extractTokens(text: string): TokenRef[] {
  const tokens: TokenRef[] = [];
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    tokens.push({ namespace: match[1]!, id: match[2]!, raw: match[0]! });
  }
  return tokens;
}

/**
 * Check model prose against the values the system actually decided.
 *
 * `knownIds` is the set of ids the caller computed *before* the model ran. A
 * token naming anything else means the model invented a metric that was never
 * decided — which is the same failure as inventing the number, one level up.
 */
export function guard(text: string, knownIds: Iterable<string>): GuardResult {
  const known = new Set(knownIds);
  const tokens = extractTokens(text);
  const violations: GuardViolation[] = [];

  for (const token of tokens) {
    if (!known.has(token.id)) {
      violations.push({
        kind: 'unknown-token',
        detail: `${token.raw} names "${token.id}", which the system never decided.`,
      });
    }
  }

  const stripped = text.replace(TOKEN_PATTERN, ' ');

  const digit = stripped.match(DIGIT_PATTERN);
  if (digit) {
    violations.push({
      kind: 'bare-number',
      detail: `Digit ${JSON.stringify(digit[0])} written outside a token.`,
    });
  }

  const word = stripped
    .toLowerCase()
    .split(/[^a-z]+/)
    .find((candidate) => NUMBER_WORD_SET.has(candidate));
  if (word !== undefined) {
    violations.push({
      kind: 'number-word',
      detail: `Number word ${JSON.stringify(word)} written outside a token.`,
    });
  }

  return { ok: violations.length === 0, violations, tokens };
}

/**
 * Bind tokens to real values, after the guard has passed.
 *
 * Refuses rather than rendering a partial string: a token left unbound would
 * reach the founder as literal `{{metric:runway}}`, and one silently replaced
 * with an empty string is worse — it reads as a finished sentence that has
 * quietly lost its number.
 */
export function render(text: string, values: ReadonlyMap<string, string>): string {
  return text.replace(TOKEN_PATTERN, (raw, _namespace: string, id: string) => {
    const value = values.get(id);
    if (value === undefined) {
      throw new Error(`Cannot render ${raw}: no value was decided for "${id}".`);
    }
    return value;
  });
}
