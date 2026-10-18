import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ipAiLimiter, userAiLimiter } from './middleware/rateLimit.ts';
import { requireAuth } from './modules/identity/index.ts';
import { founderRouter } from './modules/founder/index.ts';
import { aiRouter } from './modules/ai/index.ts';
import { financeRouter, readinessRouter } from './modules/funding/index.ts';
import evaluateRoute from './routes/evaluate.js';
import generateRoute from './routes/generate.js';
import { globalErrorHandler, registerProcessGuards } from './middleware/errorHandler.js';
import { onRequest } from 'firebase-functions/v2/https';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Crucial for rate limiting behind Render proxy
const PORT = Number(process.env.PORT || process.env.LOCAL_PORT || 8080);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'https://d557c47f-waoufund-ai-fundraising-platform.netlify.app',
  'https://waoufund.com',
  'https://www.waoufund.com',
  'https://project-f62f4191-7560-45ab-8f3.web.app',
  'https://project-f62f4191-7560-45ab-8f3.firebaseapp.com',
  'https://waou-fund.vercel.app',
];

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile clients, CLI/cron tools, and same-origin where origin is undefined
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('exp://')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Bypass-Tunnel-Reminder'],
}));

// Request size limits: 1MB to prevent large payload denial-of-service
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request timeout middleware (30s)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Gateway timeout: request took too long to process' });
    }
  });
  next();
});

// Routes — mounted on both '/api/*' and '/*' to guarantee full routing compatibility
// whether accessed via Firebase Hosting rewrite, Cloud Functions direct URL, or local dev.
app.use(['/api/ai', '/ai'], ipAiLimiter, requireAuth, userAiLimiter, aiRouter);
app.use(['/api/startup', '/startup'], ipAiLimiter, founderRouter);
app.use(['/api/evaluate', '/evaluate'], ipAiLimiter, evaluateRoute);
app.use(['/api/generate', '/generate'], ipAiLimiter, generateRoute);
app.use(['/api/finance', '/finance'], ipAiLimiter, financeRouter);
app.use(['/api/readiness', '/readiness'], readinessRouter);

// Root and API status endpoints
app.get(['/', '/api'], (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'WaouFund Backend Cloud API',
    version: '1.0.0',
    webApp: 'https://project-f62f4191-7560-45ab-8f3.web.app',
    message: 'WaouFund Backend API is running and ready for requests.',
  });
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', message: 'WaouFund Backend is running' });
});

// Global Error Handler — MUST be registered after all routes
app.use(globalErrorHandler);

// Register process-level crash guards before starting the server
registerProcessGuards();

// Export the Express app as a Firebase Cloud Function
export const api = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 300, memory: '1GiB', invoker: 'public' }, app);

// Start Server locally only when explicitly requested, never during Cloud Function discovery
if (process.env.SERVE_LOCAL === 'true' || process.argv.includes('--serve')) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  });
}
