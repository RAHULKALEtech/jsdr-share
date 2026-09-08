import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import uploadRouter from './uploadHandler.js';

const app = express();

// Configure CORS for maximum interoperability
app.use(
  cors({
    origin: true, // Reflect request origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-file-id',
      'x-file-name',
      'x-file-size',
      'x-file-type',
      'x-chunk-index',
      'x-total-chunks',
      'x-sha256',
      'range',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host'
    ],
    exposedHeaders: [
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'Content-Disposition',
      'X-File-SHA256'
    ],
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// High-capacity Rate Limiter for Chunked Uploads & File Downloads
const chunkUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Upload rate limit exceeded. Please try again in a few moments.' },
});

// Standard Rate Limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  skip: (req) => req.path.includes('/upload-chunk') || req.path.includes('/download'),
});

// Apply rate limiters
app.use('/api/transfer', chunkUploadLimiter);
app.use('/transfer', chunkUploadLimiter);
app.use('/api', apiLimiter);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'JSDR Share API' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'JSDR Share API' });
});

// Mount transfer API routes at both `/api/transfer` and `/transfer` to support both direct and rewritten proxy URLs
app.use('/api/transfer', uploadRouter);
app.use('/transfer', uploadRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API ERROR]', err);
  res.status(500).json({ success: false, error: err.message || 'An unexpected internal server error occurred.' });
});

export default app;
