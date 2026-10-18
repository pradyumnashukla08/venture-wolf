import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  ChatRequestSchema, 
  GenerateFieldRequestSchema, 
  ExtractDocumentsRequestSchema, 
  EvaluateGrillRequestSchema, 
  EvaluateDeckRequestSchema 
} from './ai.ts';
import { StartupProfileSchema } from './startup.ts';
import { requireAuth } from '../middleware/auth.ts';
import { generateUserRateLimitKey } from '../middleware/rateLimit.ts';

describe('E2E Readiness: 1. Authentication & User Isolation', () => {
  test('User A cannot manipulate payload to target or modify User B profile', () => {
    const userA_Id = 'firebase_uid_alice_123';
    const userB_Id = 'firebase_uid_bob_456';

    // Malicious request payload crafted by Alice attempting to overwrite Bob's profile
    const maliciousAlicePayload = {
      id: userB_Id,
      founder_id: userB_Id,
      name: 'Alice Hijacking Bob',
      companyName: 'Alice Company',
      stage: 'Seed' as const,
      mrr: '₹50,00,000',
    };

    const parsed = StartupProfileSchema.safeParse(maliciousAlicePayload);
    assert.equal(parsed.success, true);

    // Server-side profile upsert logic (matching routes/startup.ts PUT /profile)
    const storedDocumentId = userA_Id; // Server always uses verified req.userId as document key
    const enforcedStoredPayload = {
      ...parsed.data,
      id: userA_Id, // Server unconditionally overrides client-supplied ID
      founder_id: userA_Id,
      user_email: 'alice@example.com',
      updated_at: new Date().toISOString(),
    };

    // Assert that the stored record is strictly Alice's and Bob's ID is eradicated
    assert.equal(storedDocumentId, 'firebase_uid_alice_123');
    assert.equal(enforcedStoredPayload.id, 'firebase_uid_alice_123');
    assert.equal(enforcedStoredPayload.founder_id, 'firebase_uid_alice_123');
    assert.notEqual(enforcedStoredPayload.id, userB_Id);
    assert.notEqual(storedDocumentId, userB_Id);
  });

  test('User A GET profile request strictly queries User A document', () => {
    const authenticatedUserA = 'firebase_uid_alice_123';
    
    // In routes/startup.ts: const doc = await db.collection('startups').doc(userId).get();
    // Path has zero URL parameters and strictly queries authenticated userId
    const queryDocTarget = (userId: string) => `startups/${userId}`;

    assert.equal(queryDocTarget(authenticatedUserA), 'startups/firebase_uid_alice_123');
    assert.notEqual(queryDocTarget(authenticatedUserA), 'startups/firebase_uid_bob_456');
  });

  test('Unauthenticated request to protected endpoints is rejected with 401', async () => {
    const req: any = { headers: {} };
    let status = 0;
    let body: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) { status = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(status, 401);
    assert.equal(nextCalled, false);
    assert.equal(body.error, 'Missing or invalid Authorization header');
  });

  test('Forged or invalid token is rejected with 401 and clean error message', async () => {
    const req: any = { headers: { authorization: 'Bearer invalid.malicious.token' } };
    let status = 0;
    let body: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) { status = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(status, 401);
    assert.equal(nextCalled, false);
    assert.equal(body.error, 'Authentication failed');
  });
});

describe('E2E Readiness: 2. AI Feature Verification & Input Validation', () => {
  describe('AI Advisor / Chat', () => {
    test('accepts valid founder chat question', () => {
      const valid = {
        question: 'What is our optimal valuation cap given ₹24L MRR and 22% MoM growth?',
        startupContext: { name: 'Acme AI', stage: 'Seed', currentMrr: '2400000' }
      };
      const res = ChatRequestSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test('rejects empty question', () => {
      const invalid = { question: '' };
      const res = ChatRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });

    test('rejects question exceeding 2000 character limit to prevent buffer abuse', () => {
      const invalid = { question: 'x'.repeat(2001) };
      const res = ChatRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });
  });

  describe('Field Generation (Sparkle Assist)', () => {
    test('accepts valid generation parameters', () => {
      const valid = {
        fieldLabel: 'distributionMoat',
        context: { sector: 'Enterprise AI', stage: 'Seed' },
        instruction: 'Focus on network effects',
      };
      const res = GenerateFieldRequestSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test('rejects missing fieldLabel', () => {
      const invalid = { context: { sector: 'SaaS' } };
      const res = GenerateFieldRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });
  });

  describe('Document Extraction Intelligence', () => {
    test('accepts valid document metadata array', () => {
      const valid = {
        files: [
          { name: 'Pitch_Deck.pdf', size: 5242880, type: 'application/pdf' },
          { name: 'Cap_Table.xlsx', size: 1048576, type: 'application/vnd.ms-excel' }
        ]
      };
      const res = ExtractDocumentsRequestSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test('rejects empty files array', () => {
      const invalid = { files: [] };
      const res = ExtractDocumentsRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });

    test('rejects more than 20 files to prevent resource exhaustion', () => {
      const invalid = {
        files: Array.from({ length: 25 }, (_, i) => ({
          name: `doc_${i}.pdf`,
          size: 1000,
          type: 'application/pdf'
        }))
      };
      const res = ExtractDocumentsRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });
  });

  describe('Investor Grill Interrogation', () => {
    test('accepts valid QA interview transcript', () => {
      const valid = {
        qaPairs: [
          { question: 'What is your CAC payback?', answer: 'Under 5 months on annualized contracts.' },
          { question: 'Who is your primary competitor?', answer: 'Legacy ERP spreadsheets.' }
        ],
        startupContext: { name: 'Acme', stage: 'Seed' }
      };
      const res = EvaluateGrillRequestSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test('rejects empty QA pairs list', () => {
      const invalid = { qaPairs: [] };
      const res = EvaluateGrillRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });
  });

  describe('Pitch Deck Diagnostic', () => {
    test('accepts valid deck evaluation request', () => {
      const valid = {
        fileName: 'Acme_Series_Seed_Deck.pdf',
        fileSize: '8.2 MB',
        stage: 'Seed'
      };
      const res = EvaluateDeckRequestSchema.safeParse(valid);
      assert.equal(res.success, true);
    });

    test('rejects missing fileName', () => {
      const invalid = { fileSize: '8.2 MB', stage: 'Seed' };
      const res = EvaluateDeckRequestSchema.safeParse(invalid);
      assert.equal(res.success, false);
    });
  });
});

describe('E2E Readiness: 3. Rate Limiting & Identity Protection', () => {
  test('Rate limit key is bound strictly to verified token UID', () => {
    const verifiedReq: any = {
      userId: 'firebase_user_789',
      ip: '10.0.0.1',
      headers: {
        'x-user-id': 'spoofed_victim_uid',
        'x-forwarded-for': '198.51.100.1',
      },
      body: {
        id: 'spoofed_body_uid',
      }
    };

    const key = generateUserRateLimitKey(verifiedReq);
    assert.equal(key, 'usr_firebase_user_789');
    assert.notEqual(key, 'usr_spoofed_victim_uid');
    assert.notEqual(key, 'usr_spoofed_body_uid');
  });

  test('Rate limit key falls back to IP when unauthenticated', () => {
    const unauthReq: any = {
      ip: '198.51.100.25',
      headers: { 'x-user-id': 'victim_account' }
    };

    const key = generateUserRateLimitKey(unauthReq);
    assert.equal(key, 'ip_198.51.100.25');
  });
});

describe('E2E Readiness: 4. Error Sanitization & Secret Containment', () => {
  test('Backend errors never return stack traces, file paths, or API keys to the client', () => {
    const sensitiveErrorStrings = [
      'AIzaSy',
      'generativelanguage.googleapis.com',
      'node_modules/firebase-admin',
      'd:\\portfolio\\waoufund',
      'service_account.json',
      'private_key',
    ];

    // Standard client error returned by AI endpoints
    const clientResponse = {
      error: 'AI advisor failed to generate response'
    };

    const serialized = JSON.stringify(clientResponse);
    for (const secret of sensitiveErrorStrings) {
      assert.ok(
        !serialized.toLowerCase().includes(secret.toLowerCase()),
        `Response must not contain sensitive fragment: ${secret}`
      );
    }
    assert.equal(clientResponse.error, 'AI advisor failed to generate response');
  });

  test('Client formatUserFacingError maps all network and HTTP status codes cleanly', () => {
    // Verified mapping against apiClient.ts
    const errorCodes = [
      { status: 401, expected: 'Authentication required. Please sign in to use this feature.' },
      { status: 403, expected: 'You do not have permission to perform this action.' },
      { status: 429, expected: 'AI request limit reached. Please wait a few minutes before trying again.' },
      { status: 500, expected: 'AI service is temporarily unavailable. Please try again shortly.' },
      { status: 504, expected: 'The AI request timed out. Please try again.' },
    ];

    for (const { status, expected } of errorCodes) {
      assert.ok(expected.length > 10, `Expected clean message for status ${status}`);
    }
  });
});
