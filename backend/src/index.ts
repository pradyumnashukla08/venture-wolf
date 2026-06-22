import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import evaluateRoute from './routes/evaluate.js';
import generateRoute from './routes/generate.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Crucial for rate limiting behind Render proxy
const PORT = Number(process.env.PORT || 8080);

// Rate Limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many evaluation requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/evaluate', aiLimiter, evaluateRoute);
app.use('/api/generate', aiLimiter, generateRoute);

// Root endpoint for Uptime monitors
app.get('/', (req, res) => {
  res.status(200).send('Venture Wolf API is online.');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Venture Wolf Backend is running' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});
