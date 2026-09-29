import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../database/db';
import { AIProviderFactory } from '../ai/provider';
import { buildFlashcardsPrompt } from '../../prompts/flashcards';
import { FlashcardItem, FlashcardSchema } from '../ai/types';
import { calculateNextReview, ReviewRating } from './spacedRepetition';
import { logger } from '../security/logger';

export async function generateFlashcards(lectureId: string, userId: string): Promise<FlashcardItem[]> {
  const db = getDb();

  const transcriptRow = db.prepare('SELECT full_text FROM transcripts WHERE lecture_id = ?').get(lectureId) as {
    full_text: string;
  } | undefined;

  if (!transcriptRow) {
    throw new Error('Transcript not found for this lecture');
  }

  const provider = await AIProviderFactory.getProvider();
  logger.info('FlashcardGenerator', `Generating cards using provider: ${provider.name}`, { lectureId });

  const prompt = buildFlashcardsPrompt(transcriptRow.full_text);
  const rawCards = await provider.generateStructured(prompt, z.array(FlashcardSchema));

  db.exec('BEGIN TRANSACTION;');
  try {
    const insertCard = db.prepare(`
      INSERT INTO flashcards (
        id, lecture_id, user_id, question, answer, topic, difficulty,
        card_type, timestamp_ref, is_known, is_difficult, order_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    const insertProgress = db.prepare(`
      INSERT INTO study_progress (
        id, user_id, flashcard_id, repetitions, interval_days, ease_factor, next_review_at
      ) VALUES (?, ?, ?, 0, 0, 2.5, ?)
    `);

    const now = new Date().toISOString();

    rawCards.forEach((card: FlashcardItem, idx: number) => {
      const cardId = crypto.randomUUID();
      insertCard.run(
        cardId,
        lectureId,
        userId,
        card.question,
        card.answer,
        card.topic ?? 'General',
        card.difficulty ?? 'medium',
        card.cardType ?? 'question_answer',
        card.timestamp ?? 0,
        idx,
        now
      );

      insertProgress.run(
        crypto.randomUUID(),
        userId,
        cardId,
        now // Due immediately for initial study
      );
    });

    db.exec('COMMIT;');
    logger.info('FlashcardGenerator', `Successfully generated ${rawCards.length} flashcards`, { lectureId });
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return rawCards;
}

export function reviewFlashcard(cardId: string, userId: string, rating: ReviewRating): void {
  const db = getDb();

  const progressRow = db.prepare(`
    SELECT id, repetitions, interval_days, ease_factor
    FROM study_progress
    WHERE flashcard_id = ? AND user_id = ?
  `).get(cardId, userId) as {
    id: string;
    repetitions: number;
    interval_days: number;
    ease_factor: number;
  } | undefined;

  const nextState = calculateNextReview(rating, progressRow ? {
    repetitions: progressRow.repetitions,
    intervalDays: progressRow.interval_days,
    easeFactor: progressRow.ease_factor,
  } : undefined);

  if (progressRow) {
    db.prepare(`
      UPDATE study_progress
      SET repetitions = ?, interval_days = ?, ease_factor = ?, next_review_at = ?, last_reviewed_at = ?
      WHERE id = ?
    `).run(
      nextState.repetitions,
      nextState.intervalDays,
      nextState.easeFactor,
      nextState.nextReviewAt,
      nextState.lastReviewedAt,
      progressRow.id
    );
  } else {
    db.prepare(`
      INSERT INTO study_progress (
        id, user_id, flashcard_id, repetitions, interval_days, ease_factor, next_review_at, last_reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      cardId,
      nextState.repetitions,
      nextState.intervalDays,
      nextState.easeFactor,
      nextState.nextReviewAt,
      nextState.lastReviewedAt
    );
  }
}
