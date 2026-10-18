import type { Request, Response, NextFunction } from 'express';
/**
 * Extends the Express Request with authenticated user fields.
 * After passing through requireAuth, `req.userId` and `req.userEmail`
 * are guaranteed to be populated.
 */
export interface AuthenticatedRequest extends Request {
    userId: string;
    userEmail?: string | undefined;
}
/**
 * Express middleware that enforces Supabase JWT authentication.
 * Extracts the Bearer token, verifies it against Supabase Auth,
 * and injects the authenticated user's ID into the request object.
 *
 * Usage: router.post('/', requireAuth, async (req, res) => { ... })
 */
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map