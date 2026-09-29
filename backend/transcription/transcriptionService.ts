import crypto from 'crypto';
import { getDb } from '../database/db';
import { TranscriptionProviderFactory } from './whisperProvider';
import { CancellationToken } from './types';
import { logger } from '../security/logger';

interface ActiveJob {
  cancellationToken: CancellationToken;
  progressPercent: number;
  statusText: string;
}

const activeJobs = new Map<string, ActiveJob>();

export function getTranscriptionProgress(lectureId: string): { progress: number; status: string; isRunning: boolean } {
  const job = activeJobs.get(lectureId);
  if (job) {
    return { progress: job.progressPercent, status: job.statusText, isRunning: true };
  }
  return { progress: 0, status: 'Idle', isRunning: false };
}

export function cancelTranscription(lectureId: string): boolean {
  const job = activeJobs.get(lectureId);
  if (job) {
    job.cancellationToken.cancel();
    activeJobs.delete(lectureId);
    const db = getDb();
    db.prepare("UPDATE lectures SET status = 'CANCELLED' WHERE id = ?").run(lectureId);
    logger.info('TranscriptionService', 'Cancelled transcription job', { lectureId });
    return true;
  }
  return false;
}

export async function transcribeLecture(
  lectureId: string,
  audioFilePath: string,
  language = 'en'
): Promise<void> {
  const db = getDb();
  const cancellationToken = new CancellationToken();

  activeJobs.set(lectureId, {
    cancellationToken,
    progressPercent: 0,
    statusText: 'Starting local transcription...',
  });

  db.prepare("UPDATE lectures SET status = 'TRANSCRIBING', updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    lectureId
  );

  try {
    const provider = await TranscriptionProviderFactory.getProvider();
    logger.info('TranscriptionService', `Using provider: ${provider.name}`, { lectureId });

    const result = await provider.transcribe(audioFilePath, {
      language,
      cancellationToken,
      onProgress: (percent, text) => {
        const current = activeJobs.get(lectureId);
        if (current) {
          current.progressPercent = percent;
          current.statusText = text;
        }
      },
    });

    // Save transcript into database
    const transcriptId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Remove any previous transcript for this lecture
      db.prepare('DELETE FROM transcripts WHERE lecture_id = ?').run(lectureId);

      db.prepare(`
        INSERT INTO transcripts (id, lecture_id, full_text, language, is_cleaned, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(transcriptId, lectureId, result.fullText, result.language, now);

      const insertSegment = db.prepare(`
        INSERT INTO transcript_segments (id, transcript_id, start_time, end_time, text, confidence)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const seg of result.segments) {
        insertSegment.run(
          crypto.randomUUID(),
          transcriptId,
          seg.start,
          seg.end,
          seg.text,
          seg.confidence ?? 1.0
        );
      }

      db.prepare("UPDATE lectures SET status = 'TRANSCRIBED', updated_at = ? WHERE id = ?").run(
        now,
        lectureId
      );

      db.exec('COMMIT;');
      logger.info('TranscriptionService', 'Transcription completed and saved', {
        lectureId,
        segmentsCount: result.segments.length,
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error) {
    logger.error('TranscriptionService', 'Transcription failed', error, { lectureId });
    db.prepare("UPDATE lectures SET status = 'FAILED', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      lectureId
    );
    throw error;
  } finally {
    activeJobs.delete(lectureId);
  }
}
