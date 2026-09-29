import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDatabase, closeDb } from './database/db';
import { recoverInterruptedJobs } from './services/pipeline';
import { logger } from './security/logger';

import authRoutes from './auth/routes';
import lectureRoutes from './routes/lectureRoutes';
import studyRoutes from './routes/studyRoutes';
import settingsRoutes from './routes/settingsRoutes';
import syncRoutes from './routes/syncRoutes';

const app = express();

// Security HTTP headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws: http://localhost:* http://127.0.0.1:*;"
  );
  next();
});

// Middleware
app.use(
  cors({
    origin: [`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'LOCAL',
    timestamp: new Date().toISOString(),
    privacy: {
      aiProcessing: 'LOCAL',
      externalAiServices: 'NONE',
      transcription: 'LOCAL',
      audioUpload: 'DISABLED',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/source', syncRoutes);

// In production, serve static frontend files
const distFrontend = path.resolve(process.cwd(), 'dist/frontend');
if (fs.existsSync(distFrontend)) {
  app.use(express.static(distFrontend));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distFrontend, 'index.html'));
  });
}

// Global error handler (Never leak stack traces or internal secrets)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server', 'Unhandled error', err);
  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'An internal error occurred.' : (err.message || 'Internal Server Error'),
  });
});

// Initialize database and start server
initDatabase();

const server = app.listen(config.port, config.host, () => {
  logger.info('Server', `LocalLecture backend listening on http://${config.host}:${config.port}`);
  logger.info('Server', 'AI Processing: LOCAL | External AI: NONE | Transcription: LOCAL');

  // Check and recover any interrupted jobs from previous runs
  recoverInterruptedJobs().catch((err) => {
    logger.error('Server', 'Interrupted jobs recovery error', err);
  });
});

// Graceful shutdown
function shutdown(): void {
  logger.info('Server', 'Shutting down gracefully...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
