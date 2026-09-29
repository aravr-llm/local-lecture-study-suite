import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RECORDINGS_DIR } from '../config';
import { assertSafePath, isAllowedAudio } from '../security/sanitizer';
import { getDb } from '../database/db';
import { logger } from '../security/logger';

export interface AudioRecordInfo {
  id: string;
  lectureId: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Appends a raw binary audio chunk to the lecture recording file on disk.
 * This guarantees long lectures (multiple hours) are written incrementally to disk
 * without holding large audio buffers in memory.
 */
export async function appendAudioChunk(
  lectureId: string,
  chunkBuffer: Buffer,
  format = 'webm'
): Promise<{ bytesWritten: number; totalSize: number }> {
  const fileName = `${lectureId}.${format}`;
  const targetPath = assertSafePath(RECORDINGS_DIR, fileName);

  await fs.promises.appendFile(targetPath, chunkBuffer);
  const stats = await fs.promises.stat(targetPath);

  return {
    bytesWritten: chunkBuffer.length,
    totalSize: stats.size,
  };
}

/**
 * Finalizes an audio recording for a lecture and records it in SQLite.
 */
export async function finalizeAudioRecording(
  lectureId: string,
  durationSeconds: number,
  format = 'webm'
): Promise<AudioRecordInfo> {
  const fileName = `${lectureId}.${format}`;
  const targetPath = assertSafePath(RECORDINGS_DIR, fileName);

  if (!fs.existsSync(targetPath)) {
    throw new Error('Recording file not found on disk');
  }

  const stats = await fs.promises.stat(targetPath);
  const db = getDb();
  const audioId = crypto.randomUUID();
  const now = new Date().toISOString();
  const mimeType = format === 'wav' ? 'audio/wav' : 'audio/webm';

  // Check if audio file record already exists
  const existing = db.prepare('SELECT id FROM audio_files WHERE lecture_id = ?').get(lectureId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE audio_files
      SET file_size = ?, duration_seconds = ?
      WHERE id = ?
    `).run(stats.size, Math.round(durationSeconds), existing.id);
  } else {
    db.prepare(`
      INSERT INTO audio_files (id, lecture_id, file_path, file_size, mime_type, duration_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(audioId, lectureId, targetPath, stats.size, mimeType, Math.round(durationSeconds), now);
  }

  // Update lecture duration and status
  db.prepare(`
    UPDATE lectures
    SET duration_seconds = ?, status = 'RECORDED', updated_at = ?
    WHERE id = ?
  `).run(Math.round(durationSeconds), now, lectureId);

  logger.info('AudioService', 'Finalized audio recording', {
    lectureId,
    fileSize: stats.size,
    durationSeconds: Math.round(durationSeconds),
  });

  return {
    id: audioId,
    lectureId,
    filePath: targetPath,
    fileSize: stats.size,
    mimeType,
    durationSeconds: Math.round(durationSeconds),
  };
}

/**
 * Deletes audio file from disk and database while leaving notes/transcripts intact.
 */
export async function deleteAudioFile(lectureId: string): Promise<boolean> {
  const db = getDb();
  const audio = db.prepare('SELECT id, file_path FROM audio_files WHERE lecture_id = ?').get(lectureId) as {
    id: string;
    file_path: string;
  } | undefined;

  if (!audio) {
    return false;
  }

  try {
    if (fs.existsSync(audio.file_path)) {
      await fs.promises.unlink(audio.file_path);
    }
  } catch (error) {
    logger.warn('AudioService', 'Could not delete physical audio file from disk', { path: audio.file_path });
  }

  db.prepare('DELETE FROM audio_files WHERE id = ?').run(audio.id);
  logger.info('AudioService', 'Deleted audio file record', { lectureId });
  return true;
}

/**
 * Gets path to recorded audio file safely.
 */
export function getAudioFilePath(lectureId: string): string | null {
  const db = getDb();
  const audio = db.prepare('SELECT file_path FROM audio_files WHERE lecture_id = ?').get(lectureId) as {
    file_path: string;
  } | undefined;

  if (!audio || !fs.existsSync(audio.file_path)) {
    return null;
  }

  return assertSafePath(RECORDINGS_DIR, path.basename(audio.file_path));
}
