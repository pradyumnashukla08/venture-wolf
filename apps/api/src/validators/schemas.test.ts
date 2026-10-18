import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRequestSchema } from './schemas.ts';
import { ForecastRequestSchema } from './financeSchemas.ts';

describe('evaluateRequestSchema', () => {
  test('should accept valid input', () => {
    const input = {
      stage: 'Seed',
      documents: [{ type: 'Pitch Deck', path: 'user-id/deck.pdf' }]
    };
    const result = evaluateRequestSchema.safeParse(input);
    assert.equal(result.success, true);
  });

  test('should reject invalid stage', () => {
    const input = {
      stage: 'IPO',
      documents: []
    };
    const result = evaluateRequestSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test('should fill default documents array if missing', () => {
    const input = { stage: 'Pre-Seed' };
    const result = evaluateRequestSchema.safeParse(input);
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.documents, []);
    }
  });
});

describe('ForecastRequestSchema', () => {
  test('should accept valid forecast input', () => {
    const input = {
      companyName: 'Test Corp',
      archetype: 'SAAS',
      description: 'A great B2B SaaS platform for testing.',
      documentUrls: []
    };
    const result = ForecastRequestSchema.safeParse(input);
    assert.equal(result.success, true);
  });

  test('should reject invalid archetype', () => {
    const input = {
      companyName: 'Test Corp',
      archetype: 'RETAIL', // Not in enum
      description: 'A great retail store.'
    };
    const result = ForecastRequestSchema.safeParse(input);
    assert.equal(result.success, false);
  });
});
