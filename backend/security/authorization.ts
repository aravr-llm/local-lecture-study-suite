import { getDb } from '../database/db';

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden: Access denied to requested resource') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Asserts that the requested lecture belongs to the authenticated user.
 */
export function assertLectureOwnership(lectureId: string, userId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM lectures WHERE id = ?').get(lectureId) as { user_id: string } | undefined;
  if (!row) {
    throw new Error('Lecture not found');
  }
  if (row.user_id !== userId) {
    throw new AuthorizationError();
  }
}

/**
 * Asserts that the requested flashcard belongs to the authenticated user.
 */
export function assertFlashcardOwnership(cardId: string, userId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM flashcards WHERE id = ?').get(cardId) as { user_id: string } | undefined;
  if (!row) {
    throw new Error('Flashcard not found');
  }
  if (row.user_id !== userId) {
    throw new AuthorizationError();
  }
}

/**
 * Asserts that the requested quiz set belongs to the authenticated user.
 */
export function assertQuizOwnership(quizSetId: string, userId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM quiz_sets WHERE id = ?').get(quizSetId) as { user_id: string } | undefined;
  if (!row) {
    throw new Error('Quiz set not found');
  }
  if (row.user_id !== userId) {
    throw new AuthorizationError();
  }
}
