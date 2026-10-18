import type { Request, Response, NextFunction } from 'express';
/**
 * Express error type with optional HTTP status code.
 */
interface HttpError extends Error {
    status?: number;
    statusCode?: number;
}
/**
 * Global error-handling middleware for Express.
 *
 * Must be registered AFTER all routes with app.use(globalErrorHandler).
 * Express identifies error-handling middleware by the 4-parameter signature.
 *
 * In production: returns clean JSON without stack traces.
 * In development: includes error stack for debugging.
 */
export declare const globalErrorHandler: (err: HttpError, req: Request, res: Response, _next: NextFunction) => void;
/**
 * Process-level crash guards.
 *
 * Call this once at server startup (before app.listen) to prevent
 * the Node.js process from silently dying on unhandled async errors.
 */
export declare const registerProcessGuards: () => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map