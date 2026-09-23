import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import evaluateRoute from './routes/evaluate.js';
import generateRoute from './routes/generate.js';
import financeRoute from './routes/finance.js';
import readinessRoute from './routes/readiness.js';
import { globalErrorHandler, registerProcessGuards } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Crucial for rate limiting behind Render proxy
const PORT = Number(process.env.PORT || 8080);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many evaluation requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['https://app.venturewolf.com', 'venturewolf://'], // Restricted origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Bypass-Tunnel-Reminder'],
}));
app.use(express.json());

// Routes
app.use('/api/evaluate', aiLimiter, evaluateRoute);
app.use('/api/generate', aiLimiter, generateRoute);
app.use('/api/finance', aiLimiter, financeRoute);
// Readiness is pure computation with no model call, so it is not behind the AI
// limiter: rate limiting it would throttle a client polling its own score.
app.use('/api/readiness', readinessRoute);

// Root endpoint for Uptime monitors
app.get('/', (req, res) => {
  res.status(200).send('Venture Wolf API is online.');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Venture Wolf Backend is running' });
});

// Global Error Handler — MUST be registered after all routes
app.use(globalErrorHandler);

// Register process-level crash guards before starting the server
registerProcessGuards();

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});
