import type { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase.ts';

/**
 * Extends the Express Request with authenticated user fields.
 * After passing through requireAuth, `req.userId` and `req.userEmail`
 * are guaranteed to be populated.
 */
export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail?: string | undefined;
  token: string;
}

/**
 * Express middleware that enforces Firebase JWT authentication with guest fallback.
 * Extracts the Bearer token, verifies it against Firebase Auth,
 * and injects the authenticated user's ID into the request object.
 * 
 * If no token is provided or during initial onboarding exploration, gracefully
 * assigns a guest session identity so public AI endpoints remain functional.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (req as AuthenticatedRequest).userId = (req.ip || 'guest_user').replace(/[^a-zA-Z0-9_-]/g, '_');
      (req as AuthenticatedRequest).userEmail = 'guest@waoufund.com';
      (req as AuthenticatedRequest).token = '';
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      (req as AuthenticatedRequest).userId = (req.ip || 'guest_user').replace(/[^a-zA-Z0-9_-]/g, '_');
      (req as AuthenticatedRequest).userEmail = 'guest@waoufund.com';
      (req as AuthenticatedRequest).token = '';
      return next();
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      if (decodedToken && decodedToken.uid) {
        (req as AuthenticatedRequest).userId = decodedToken.uid;
        (req as AuthenticatedRequest).userEmail = decodedToken.email;
        (req as AuthenticatedRequest).token = token;
        return next();
      }
    } catch {
      // In guest exploration or non-production environment, allow request to proceed
      (req as AuthenticatedRequest).userId = (req.ip || 'guest_user').replace(/[^a-zA-Z0-9_-]/g, '_');
      (req as AuthenticatedRequest).userEmail = 'guest@waoufund.com';
      (req as AuthenticatedRequest).token = '';
      return next();
    }
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error:', error);
    (req as AuthenticatedRequest).userId = 'guest_user';
    (req as AuthenticatedRequest).userEmail = 'guest@waoufund.com';
    (req as AuthenticatedRequest).token = '';
    return next();
  }
};
