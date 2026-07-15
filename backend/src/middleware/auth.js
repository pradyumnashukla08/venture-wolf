import { supabaseAdmin } from '../config/supabase.js';
/**
 * Express middleware that enforces Supabase JWT authentication.
 * Extracts the Bearer token, verifies it against Supabase Auth,
 * and injects the authenticated user's ID into the request object.
 *
 * Usage: router.post('/', requireAuth, async (req, res) => { ... })
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
        const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !userData?.user) {
            console.error('[Auth Middleware] Verification failed:', authError?.message);
            res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
            return;
        }
        // Inject authenticated user data into the request for downstream handlers
        req.userId = userData.user.id;
        req.userEmail = userData.user.email;
        next();
    }
    catch (error) {
        console.error('[Auth Middleware] Unexpected error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};
//# sourceMappingURL=auth.js.map