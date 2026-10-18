import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FactRegistry } from './factRegistry.ts';

test('a figure from the founder deck is recognised', () => {
  const registry = new FactRegistry().ingest('Our MRR is 500000 and growing.');
  assert.equal(registry.has(500_000), true);
});

test('Indian grouping and magnitude words are the same number', () => {
  const registry = new FactRegistry().ingest('We raised 50,00,000 last year.');
  assert.equal(registry.has(5_000_000), true);

  const inLakhs = new FactRegistry().ingest('We raised 50 lakh last year.');
  assert.equal(inLakhs.has(5_000_000), true);
});

test('crore is recognised in its abbreviated forms', () => {
  for (const text of ['1.2 Cr', '1.2 crore', '1.2 crores']) {
    const registry = new FactRegistry().ingest(text);
    assert.equal(registry.has(12_000_000), true, `failed for ${text}`);
  }
});

test('a number the founder never supplied is unsupported', () => {
  const registry = new FactRegistry().ingest('Our MRR is 500000.');
  assert.deepEqual(registry.unsupported('Your CAC of 4000 is too high.'), [4000]);
});

test('a number the founder did supply is not flagged', () => {
  const registry = new FactRegistry().ingest('Our MRR is 500000.');
  assert.deepEqual(registry.unsupported('Your MRR of 500000 is thin for seed.'), []);
});

test('small integers in ordinary prose are not treated as claims', () => {
  const registry = new FactRegistry();
  assert.deepEqual(registry.unsupported('Your 3 founders and 2 channels.'), []);
});

test('years are not treated as claims', () => {
  const registry = new FactRegistry();
  assert.deepEqual(registry.unsupported('Since 2024 you have grown.'), []);
});

test('percentages are compared on their face value', () => {
  const registry = new FactRegistry().ingest('Churn is 5%.');
  assert.deepEqual(registry.unsupported('Your churn of 5% is acceptable.'), []);
  assert.deepEqual(registry.unsupported('Your churn of 19% is alarming.'), [19]);
});

test('several sources are indexed together', () => {
  const registry = new FactRegistry().ingestAll([
    'Deck: MRR 500000',
    'Financials: burn 250000',
    null,
    undefined,
  ]);
  assert.equal(registry.has(500_000), true);
  assert.equal(registry.has(250_000), true);
});

test('an empty registry flags every substantive number', () => {
  const registry = new FactRegistry();
  assert.deepEqual(registry.unsupported('Runway is 7 months at 250000 burn.'), [250_000]);
});
