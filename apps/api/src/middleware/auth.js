import { auth } from '../config/firebase.js';

/**
 * Express middleware that enforces Firebase JWT authentication.
 * Extracts the Bearer token, verifies it against Firebase Auth,
 * and injects the authenticated user's ID into the request object.
 */
export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header' });
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Missing bearer token' });
            return;
        }
        const decodedToken = await auth.verifyIdToken(token);
        if (!decodedToken || !decodedToken.uid) {
            console.error('[Auth Middleware] Verification failed: missing uid in token');
            res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
            return;
        }
        req.userId = decodedToken.uid;
        req.userEmail = decodedToken.email;
        req.token = token;
        next();
    }
    catch (error) {
        console.error('[Auth Middleware] Unexpected error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};
//# sourceMappingURL=auth.js.map