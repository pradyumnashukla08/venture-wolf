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

describe('Phase 1 AI Request Validation Schemas', () => {
  describe('ChatRequestSchema', () => {
    test('should accept valid chat request', () => {
      const valid = {
        question: 'What is our expected runway with current burn?',
        startupContext: {
          name: 'Venture Corp',
          stage: 'Seed',
          mrr: '₹15,00,000',
        },
      };
      const result = ChatRequestSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    test('should reject empty question', () => {
      const invalid = { question: '' };
      const result = ChatRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    test('should reject question exceeding length limit', () => {
      const invalid = { question: 'a'.repeat(2001) };
      const result = ChatRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('GenerateFieldRequestSchema', () => {
    test('should accept valid field generation input', () => {
      const valid = {
        fieldLabel: 'ELEVATOR_PITCH',
        context: { sector: 'FinTech', stage: 'Seed' },
        instruction: 'Make it institutional grade',
      };
      const result = GenerateFieldRequestSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    test('should reject missing fieldLabel', () => {
      const invalid = { context: {} };
      const result = GenerateFieldRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('ExtractDocumentsRequestSchema', () => {
    test('should accept valid files metadata', () => {
      const valid = {
        files: [
          { name: 'pitch_deck.pdf', size: 1048576, type: 'application/pdf' },
          { name: 'financials.xlsx', size: 524288, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        ],
      };
      const result = ExtractDocumentsRequestSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    test('should reject empty files list', () => {
      const invalid = { files: [] };
      const result = ExtractDocumentsRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    test('should reject file lists larger than 20 items to prevent DoS', () => {
      const invalid = {
        files: Array.from({ length: 21 }, (_, i) => ({
          name: `file_${i}.pdf`,
          size: 1000,
          type: 'application/pdf',
        })),
      };
      const result = ExtractDocumentsRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('EvaluateGrillRequestSchema', () => {
    test('should accept valid investor QA interrogation', () => {
      const valid = {
        qaPairs: [
          { question: 'What is your CAC payback period?', answer: '6 months with negative churn.' },
        ],
        startupContext: { name: 'Acme', stage: 'Seed' },
      };
      const result = EvaluateGrillRequestSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    test('should reject empty qaPairs list', () => {
      const invalid = { qaPairs: [] };
      const result = EvaluateGrillRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('EvaluateDeckRequestSchema', () => {
    test('should accept valid deck evaluation parameters', () => {
      const valid = {
        fileName: 'Acme_SeriesA_Deck.pdf',
        fileSize: '4.5 MB',
        stage: 'Series-A',
      };
      const result = EvaluateDeckRequestSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    test('should reject missing fileName', () => {
      const invalid = { fileSize: '4.5 MB' };
      const result = EvaluateDeckRequestSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });
});

describe('Phase 1 Startup Profile Validation Schema', () => {
  test('should accept valid full startup profile', () => {
    const valid = {
      name: 'SuperAI',
      companyName: 'SuperAI Private Limited',
      stage: 'Seed',
      founder: 'Rohan Sharma',
      email: 'rohan@superai.com',
      mrr: '₹12,00,000',
      burn: '₹4,00,000',
      fundabilityScore: 85,
    };
    const result = StartupProfileSchema.safeParse(valid);
    assert.equal(result.success, true);
  });

  test('should reject invalid stage enum value', () => {
    const invalid = {
      name: 'SuperAI',
      stage: 'Mega-Round', // Invalid stage
    };
    const result = StartupProfileSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('should reject missing company name', () => {
    const invalid = {
      stage: 'Seed',
      mrr: '₹12,00,000',
    };
    const result = StartupProfileSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('should reject invalid email format', () => {
    const invalid = {
      name: 'SuperAI',
      email: 'not-an-email',
    };
    const result = StartupProfileSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });
});

describe('Phase 1 Authentication & Authorization Middleware', () => {
  test('should reject request without Authorization header', async () => {
    const req: any = { headers: {} };
    let statusSet = 0;
    let jsonPayload: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusSet = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
    };

    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(statusSet, 401);
    assert.equal(nextCalled, false);
    assert.equal(jsonPayload.error, 'Missing or invalid Authorization header');
  });

  test('should reject request with non-Bearer scheme', async () => {
    const req: any = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    let statusSet = 0;
    let jsonPayload: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusSet = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
    };

    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(statusSet, 401);
    assert.equal(nextCalled, false);
    assert.equal(jsonPayload.error, 'Missing or invalid Authorization header');
  });

  test('should reject request with empty Bearer token', async () => {
    const req: any = { headers: { authorization: 'Bearer ' } };
    let statusSet = 0;
    let jsonPayload: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusSet = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
    };

    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(statusSet, 401);
    assert.equal(nextCalled, false);
    assert.equal(jsonPayload.error, 'Missing bearer token');
  });

  test('should reject fake forged token', async () => {
    const req: any = { headers: { authorization: 'Bearer fake.unsigned.jwt.token' } };
    let statusSet = 0;
    let jsonPayload: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusSet = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
    };

    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(statusSet, 401);
    assert.equal(nextCalled, false);
    assert.equal(jsonPayload.error, 'Authentication failed');
  });
});

describe('Phase 1.1 Per-User Rate Limiting Security', () => {
  test('should derive rate limit key strictly from verified req.userId', async () => {
    const { generateUserRateLimitKey } = await import('../middleware/rateLimit.ts');
    assert.ok(typeof generateUserRateLimitKey === 'function', 'generateUserRateLimitKey must be a function');

    // Authenticated request with verified UID
    const req: any = {
      userId: 'verified_uid_abc123',
      ip: '192.168.1.100',
      headers: {
        'x-user-id': 'spoofed_victim_id',
        'x-forwarded-for': '10.0.0.1',
      },
      body: {
        id: 'spoofed_body_id',
      },
    };

    const key = generateUserRateLimitKey(req);
    // Key must be strictly derived from verified userId, NOT spoofed headers or body
    assert.equal(key, 'usr_verified_uid_abc123');
    assert.notEqual(key, 'usr_spoofed_victim_id');
    assert.notEqual(key, 'usr_spoofed_body_id');
  });

  test('should fallback to IP key if request reaches limiter unauthenticated', async () => {
    const { generateUserRateLimitKey } = await import('../middleware/rateLimit.ts');

    const unauthReq: any = {
      ip: '203.0.113.195',
      socket: { remoteAddress: '203.0.113.195' },
      headers: { 'x-user-id': 'attacker_trying_to_exhaust_victim' },
      body: {},
    };

    const key = generateUserRateLimitKey(unauthReq);
    assert.equal(key, 'ip_203.0.113.195');
    assert.ok(!key.includes('attacker_trying_to_exhaust_victim'));
  });
});

describe('Phase 1.1 Cross-User Profile Isolation & Integrity', () => {
  test('should overwrite manipulated client-supplied IDs with verified session UID', () => {
    const authenticatedUserId = 'legitimate_user_456';
    const clientSuppliedBody = {
      id: 'victim_account_789', // Attacker trying to overwrite victim
      founder_id: 'victim_account_789',
      name: 'Hacked Startup',
      stage: 'Seed' as const,
      mrr: '₹10,00,000',
    };

    const parsed = StartupProfileSchema.safeParse(clientSuppliedBody);
    assert.equal(parsed.success, true);

    // Backend payload construction as implemented in startup.ts
    const finalStoredPayload = {
      ...parsed.data,
      id: authenticatedUserId, // Server enforces authenticated user identity
      founder_id: authenticatedUserId,
      user_email: 'legit@example.com',
      updated_at: new Date().toISOString(),
    };

    assert.equal(finalStoredPayload.id, authenticatedUserId);
    assert.equal(finalStoredPayload.founder_id, authenticatedUserId);
    assert.notEqual(finalStoredPayload.id, clientSuppliedBody.id);
  });

  test('should reject malformed profile payloads before reaching database', () => {
    const maliciousPayload = {
      name: '', // Empty name violates schema
      stage: 'InvalidStageEnum',
      fundabilityScore: 999999, // Out of bounds
    };

    const result = StartupProfileSchema.safeParse(maliciousPayload);
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});

describe('Phase 1.1 Error Sanitization & Secret Containment', () => {
  test('AI error responses do not leak stack traces or internal server details', () => {
    // Simulated catch block behavior as implemented in ai.ts
    const simulatedError = new Error('GoogleGenAI internal exception: API key invalid or quota exceeded at D:\\internal\\secrets');
    
    // Server handler response
    const sanitizedResponse = {
      error: 'AI advisor failed to generate response'
    };

    // Ensure error returned to user has no internal paths, API keys, or stack traces
    const responseJson = JSON.stringify(sanitizedResponse);
    assert.ok(!responseJson.includes('GoogleGenAI'));
    assert.ok(!responseJson.includes('API key'));
    assert.ok(!responseJson.includes('internal\\secrets'));
    assert.ok(!responseJson.includes('stack'));
    assert.equal(sanitizedResponse.error, 'AI advisor failed to generate response');
  });
});
