import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { z } from 'zod';
import { getDb } from '../database/db';
import { authenticateUser } from '../auth/session';
import { assertLectureOwnership } from '../security/authorization';
import { appendAudioChunk, finalizeAudioRecording, deleteAudioFile, getAudioFilePath } from '../recording/audioService';
import { runFullLecturePipeline } from '../services/pipeline';
import { getTranscriptionProgress } from '../transcription/transcriptionService';
import { logger } from '../security/logger';

const router = Router();

const CreateLectureSchema = z.object({
  title: z.string().min(1).max(200).default('Untitled Lecture'),
  subject: z.string().min(1).max(100).default('General'),
});

// All lecture routes require authentication
router.use(authenticateUser);

/**
 * List all lectures belonging to the authenticated user with search and sorting.
 */
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const query = (req.query.q as string || '').trim().toLowerCase();
  const sort = (req.query.sort as string || 'newest').toLowerCase();

  let orderBy = 'l.created_at DESC';
  if (sort === 'oldest') orderBy = 'l.created_at ASC';
  else if (sort === 'subject') orderBy = 'l.subject ASC, l.created_at DESC';
  else if (sort === 'duration') orderBy = 'l.duration_seconds DESC';

  let sql = `
    SELECT l.id, l.title, l.subject, l.duration_seconds, l.status, l.created_at, l.updated_at,
           (SELECT COUNT(*) FROM flashcards WHERE lecture_id = l.id) as flashcards_count,
           (SELECT COUNT(*) FROM quiz_sets WHERE lecture_id = l.id) as quizzes_count,
           (SELECT CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END FROM audio_files WHERE lecture_id = l.id) as has_audio
    FROM lectures l
    WHERE l.user_id = ?
  `;

  const params: any[] = [userId];

  if (query) {
    sql += ` AND (LOWER(l.title) LIKE ? OR LOWER(l.subject) LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  sql += ` ORDER BY ${orderBy}`;

  const lectures = db.prepare(sql).all(...params);
  res.json({ lectures });
});

/**
 * Create a new lecture record.
 */
router.post('/', (req: Request, res: Response) => {
  const parseResult = CreateLectureSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid lecture details' });
    return;
  }

  const { title, subject } = parseResult.data;
  const userId = req.user!.id;
  const lectureId = crypto.randomUUID();
  const now = new Date().toISOString();

  const db = getDb();
  db.prepare(`
    INSERT INTO lectures (id, user_id, title, subject, duration_seconds, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 'RECORDING', ?, ?)
  `).run(lectureId, userId, title, subject, now, now);

  logger.info('LectureRoutes', 'Created new lecture', { lectureId, userId });

  res.status(201).json({
    lecture: {
      id: lectureId,
      title,
      subject,
      status: 'RECORDING',
      duration_seconds: 0,
      created_at: now,
    },
  });
});

/**
 * Get individual lecture details.
 */
router.get('/:id', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const db = getDb();
  const lecture = db.prepare(`
    SELECT id, title, subject, duration_seconds, status, created_at, updated_at
    FROM lectures WHERE id = ?
  `).get(lectureId);

  const audioInfo = db.prepare(`
    SELECT file_size, mime_type, duration_seconds FROM audio_files WHERE lecture_id = ?
  `).get(lectureId);

  const progress = getTranscriptionProgress(lectureId);

  res.json({
    lecture,
    audioInfo: audioInfo || null,
    progress,
  });
});

/**
 * Upload raw audio chunk (streaming recording).
 */
router.post('/:id/audio-chunk', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const format = (req.query.format as string) || 'webm';
  const chunks: Buffer[] = [];

  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  req.on('end', async () => {
    try {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        res.status(400).json({ error: 'Empty audio chunk' });
        return;
      }
      const result = await appendAudioChunk(lectureId, buffer, format);
      res.json({ message: 'Chunk written', ...result });
    } catch (err: any) {
      logger.error('LectureRoutes', 'Error appending audio chunk', err, { lectureId });
      res.status(500).json({ error: 'Failed to write audio chunk' });
    }
  });
});

/**
 * Finalize audio recording and launch pipeline.
 */
router.post('/:id/finish-record', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const durationSeconds = Number(req.body.durationSeconds) || 0;
  const format = req.body.format || 'webm';

  try {
    await finalizeAudioRecording(lectureId, durationSeconds, format);

    // Launch processing pipeline in background
    runFullLecturePipeline(lectureId, userId).catch((err) => {
      logger.error('LectureRoutes', 'Pipeline background error', err, { lectureId });
    });

    res.json({ message: 'Recording saved and processing started', lectureId });
  } catch (err: any) {
    logger.error('LectureRoutes', 'Failed to finalize recording', err, { lectureId });
    res.status(500).json({ error: err.message || 'Failed to finalize recording' });
  }
});

/**
 * Stream recorded audio with HTTP Range support for scrubbable audio player.
 */
router.get('/:id/audio', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const filePath = getAudioFilePath(lectureId);
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Audio file not found' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/webm',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/webm',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

/**
 * Get lecture transcript with timestamped segments.
 */
router.get('/:id/transcript', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const db = getDb();
  const transcript = db.prepare(`
    SELECT id, full_text, language, is_cleaned, created_at
    FROM transcripts WHERE lecture_id = ?
  `).get(lectureId) as { id: string; full_text: string } | undefined;

  if (!transcript) {
    res.status(404).json({ error: 'Transcript not found for this lecture' });
    return;
  }

  const segments = db.prepare(`
    SELECT id, start_time, end_time, text, confidence
    FROM transcript_segments
    WHERE transcript_id = ?
    ORDER BY start_time ASC
  `).all(transcript.id);

  res.json({ transcript, segments });
});

/**
 * Reprocess / Retry processing for a lecture.
 */
router.post('/:id/reprocess', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  runFullLecturePipeline(lectureId, userId).catch((err) => {
    logger.error('LectureRoutes', 'Reprocess failed', err, { lectureId });
  });

  res.json({ message: 'Reprocessing started' });
});

/**
 * Delete audio file only (preserves notes, flashcards, transcript).
 */
router.delete('/:id/audio', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  await deleteAudioFile(lectureId);
  res.json({ message: 'Audio file deleted successfully' });
});

/**
 * Delete entire lecture and all generated materials.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  await deleteAudioFile(lectureId);
  const db = getDb();
  db.prepare('DELETE FROM lectures WHERE id = ?').run(lectureId);

  logger.info('LectureRoutes', 'Deleted lecture', { lectureId, userId });
  res.json({ message: 'Lecture and all associated materials deleted successfully' });
});

export default router;
