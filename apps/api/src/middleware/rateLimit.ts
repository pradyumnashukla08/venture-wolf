import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthenticatedRequest } from './auth.ts';

/**
 * IP-based rate limiter for public / edge endpoints.
 * Defends against unauthenticated flood / DoS attacks.
 */
export const ipAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Generates rate limit key scoped to the verified Firebase UID.
 * Rejects arbitrary client headers and body values.
 */
export const generateUserRateLimitKey = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.userId) {
    return `usr_${authReq.userId}`;
  }
  // Fallback to IP if invoked without prior auth (should never happen after requireAuth)
  return `ip_${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};

/**
 * Per-authenticated-user rate limiter for heavy AI operations (/api/ai/*).
 *
 * CRITICAL SECURITY GUARANTEES:
 * 1. Key is derived strictly from `(req as AuthenticatedRequest).userId` (which
 *    is verified and injected by Firebase Admin token verification in `requireAuth`).
 * 2. Arbitrary client-supplied headers (e.g. `X-User-Id`, `X-Forwarded-For`, etc.)
 *    or body fields are NEVER trusted for user identity.
 * 3. Rate-limiting is applied AFTER authentication so unauthenticated attackers
 *    cannot exhaust an authenticated user's quota.
 *
 * NOTE ON MULTI-INSTANCE / CLUSTER SCALING:
 * express-rate-limit defaults to an in-memory store (MemoryStore), which is local
 * to each Node.js process / container instance.
 * For production multi-instance horizontal scaling (e.g. multi-replica Render,
 * Kubernetes, or multi-instance Google Cloud Run / Firebase Cloud Functions),
 * a shared store such as Redis (`rate-limit-redis`) MUST be configured to share
 * user quotas consistently across all instances.
 */
export const userAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each authenticated user to 60 AI requests per 15 minutes
  message: { error: 'Too many AI requests for this account, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: generateUserRateLimitKey,
});
