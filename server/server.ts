import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import uploadRouter from './uploadHandler.js';
import { setupSocketHandlers } from './socketHandler.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Socket.IO Server configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100MB buffer safety
});

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// High-capacity Rate Limiter for Chunked Uploads & File Downloads (10,000 requests per 15 mins)
const chunkUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Upload rate limit exceeded. Please try again in a few moments.' },
});

// Standard Rate Limiter for API endpoints (1,000 requests per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  skip: (req) => req.path.includes('/upload-chunk') || req.path.includes('/download'),
});

app.use('/api/transfer', chunkUploadLimiter);
app.use('/api', apiLimiter);

// Transfer API routes
app.use('/api/transfer', uploadRouter);

// Initialize Socket.IO connection handlers
setupSocketHandlers(io);

// Serve Vite frontend build in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('JSDR Share Backend API is running.');
      }
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ success: false, error: 'An unexpected internal server error occurred.' });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  🚀 JSDR Share Server running on port ${PORT}`);
  console.log(`  👉 Local:   http://localhost:${PORT}`);
  console.log(`  ⚡ Socket:  ws://localhost:${PORT}`);
  console.log(`=================================================`);
});
