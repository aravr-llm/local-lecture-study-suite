import { getDb } from '../database/db';
import { transcribeLecture } from '../transcription/transcriptionService';
import { generateLectureNotes } from '../study/noteGenerator';
import { generateFlashcards } from '../study/flashcardGenerator';
import { generateQuiz } from '../study/quizGenerator';
import { getAudioFilePath } from '../recording/audioService';
import { logger } from '../security/logger';

export type LectureStatus =
  | 'RECORDING'
  | 'RECORDED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'ANALYZING'
  | 'GENERATING_NOTES'
  | 'GENERATING_FLASHCARDS'
  | 'GENERATING_QUIZ'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED';

export async function runFullLecturePipeline(lectureId: string, userId: string): Promise<void> {
  const db = getDb();
  logger.info('Pipeline', 'Starting lecture processing pipeline', { lectureId });

  try {
    const lecture = db.prepare('SELECT status FROM lectures WHERE id = ?').get(lectureId) as { status: LectureStatus } | undefined;
    if (!lecture) throw new Error('Lecture not found');

    const audioPath = getAudioFilePath(lectureId);
    if (!audioPath) throw new Error('Audio file not found on local disk');

    // 1. Transcription stage
    const hasTranscript = db.prepare('SELECT id FROM transcripts WHERE lecture_id = ?').get(lectureId);
    if (!hasTranscript || lecture.status === 'RECORDED' || lecture.status === 'TRANSCRIBING') {
      await transcribeLecture(lectureId, audioPath);
    }

    // 2. Note Generation stage
    db.prepare("UPDATE lectures SET status = 'GENERATING_NOTES', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      lectureId
    );
    await generateLectureNotes(lectureId);

    // 3. Flashcard Generation stage
    const existingCards = db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE lecture_id = ?').get(lectureId) as { count: number };
    if (existingCards.count === 0) {
      db.prepare("UPDATE lectures SET status = 'GENERATING_FLASHCARDS', updated_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        lectureId
      );
      await generateFlashcards(lectureId, userId);
    }

    // 4. Quiz Generation stage
    const existingQuiz = db.prepare('SELECT id FROM quiz_sets WHERE lecture_id = ?').get(lectureId);
    if (!existingQuiz) {
      db.prepare("UPDATE lectures SET status = 'GENERATING_QUIZ', updated_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        lectureId
      );
      await generateQuiz(lectureId, userId);
    }

    // 5. Complete stage
    db.prepare("UPDATE lectures SET status = 'COMPLETE', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      lectureId
    );
    logger.info('Pipeline', 'Lecture processing pipeline completed successfully', { lectureId });
  } catch (error) {
    logger.error('Pipeline', 'Pipeline processing error', error, { lectureId });
    db.prepare("UPDATE lectures SET status = 'FAILED', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      lectureId
    );
    throw error;
  }
}

/**
 * Recovers interrupted processing jobs on server startup.
 */
export async function recoverInterruptedJobs(): Promise<void> {
  const db = getDb();
  const transitionalStates: LectureStatus[] = [
    'TRANSCRIBING',
    'ANALYZING',
    'GENERATING_NOTES',
    'GENERATING_FLASHCARDS',
    'GENERATING_QUIZ',
  ];

  const placeholders = transitionalStates.map(() => '?').join(',');
  const interruptedLectures = db.prepare(`
    SELECT id, user_id, status FROM lectures WHERE status IN (${placeholders})
  `).all(...transitionalStates) as Array<{ id: string; user_id: string; status: LectureStatus }>;

  if (interruptedLectures.length === 0) {
    logger.info('Pipeline', 'No interrupted jobs detected. All lecture records are stable.');
    return;
  }

  logger.warn('Pipeline', `Detected ${interruptedLectures.length} interrupted jobs from previous shutdown. Initiating recovery...`);

  for (const job of interruptedLectures) {
    logger.info('Pipeline', `Recovering job for lecture ${job.id} from status ${job.status}`);
    // Run pipeline asynchronously to not block boot
    runFullLecturePipeline(job.id, job.user_id).catch((err) => {
      logger.error('Pipeline', `Crash recovery failed for lecture ${job.id}`, err);
    });
  }
}
