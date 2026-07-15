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
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err.name === 'ZodError') {
    res.status(400).json({ success: false, errors: err.errors });
    return;
  }

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log the full error server-side
  console.error(`[ERROR] ${req.method} ${req.path} → ${status}:`, err.message);
  if (!isProduction) {
    console.error(err.stack);
  }

  // Never leak internal details to clients in production
  const responseBody: Record<string, unknown> = {
    error: status >= 500 ? 'Internal server error' : err.message,
  };

  if (!isProduction && err.stack) {
    responseBody.stack = err.stack;
    responseBody.details = err.message;
  }

  res.status(status).json(responseBody);
};

/**
 * Process-level crash guards.
 * 
 * Call this once at server startup (before app.listen) to prevent
 * the Node.js process from silently dying on unhandled async errors.
 */
export const registerProcessGuards = (): void => {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('[FATAL] Unhandled Promise Rejection at:', promise);
    console.error('[FATAL] Reason:', reason);
    // In production with a process manager (PM2, Docker), let it restart:
    // process.exit(1);
    // For Render/Railway, log and continue to avoid downtime:
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('[FATAL] Uncaught Exception:', error.message);
    console.error(error.stack);
    // Graceful shutdown: stop accepting new connections, then exit
    process.exit(1);
  });

  console.log('[Guard] Process-level crash guards registered.');
};
