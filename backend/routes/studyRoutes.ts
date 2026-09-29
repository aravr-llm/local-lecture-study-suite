import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../database/db';
import { authenticateUser } from '../auth/session';
import { assertLectureOwnership, assertFlashcardOwnership, assertQuizOwnership } from '../security/authorization';
import { reviewFlashcard } from '../study/flashcardGenerator';
import { submitQuizAttempt } from '../study/quizGenerator';
import { getLectureExportBundle, exportToMarkdown, exportToPlainText } from '../study/exportService';
import { ReviewRating } from '../study/spacedRepetition';
import { logger } from '../security/logger';

const router = Router();
router.use(authenticateUser);

/**
 * Get generated notes and sections for a lecture.
 */
router.get('/lectures/:id/notes', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const db = getDb();
  const note = db.prepare(`
    SELECT id, title, summary, key_concepts, definitions, important_facts,
           uncertainties, study_questions, is_custom_edited, updated_at
    FROM notes WHERE lecture_id = ?
  `).get(lectureId) as any;

  if (!note) {
    res.status(404).json({ error: 'Notes have not yet been generated for this lecture.' });
    return;
  }

  const sections = db.prepare(`
    SELECT id, topic_name, content, examples, terminology, timestamp_start, order_index
    FROM note_sections WHERE note_id = ?
    ORDER BY order_index ASC
  `).all(note.id);

  res.json({
    note: {
      ...note,
      key_concepts: JSON.parse(note.key_concepts || '[]'),
      definitions: JSON.parse(note.definitions || '[]'),
      important_facts: JSON.parse(note.important_facts || '[]'),
      uncertainties: JSON.parse(note.uncertainties || '[]'),
      study_questions: JSON.parse(note.study_questions || '[]'),
      sections,
    },
  });
});

/**
 * Save user edits to lecture notes.
 */
router.put('/lectures/:id/notes', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const { title, summary, key_concepts, definitions, important_facts, uncertainties, study_questions } = req.body;
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE notes
    SET title = ?, summary = ?, key_concepts = ?, definitions = ?, important_facts = ?,
        uncertainties = ?, study_questions = ?, is_custom_edited = 1, updated_at = ?
    WHERE lecture_id = ?
  `).run(
    title,
    summary,
    JSON.stringify(key_concepts || []),
    JSON.stringify(definitions || []),
    JSON.stringify(important_facts || []),
    JSON.stringify(uncertainties || []),
    JSON.stringify(study_questions || []),
    now,
    lectureId
  );

  logger.info('StudyRoutes', 'User updated notes', { lectureId, userId });
  res.json({ message: 'Notes saved successfully' });
});

/**
 * Get flashcards for a specific lecture.
 */
router.get('/lectures/:id/flashcards', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const db = getDb();
  const cards = db.prepare(`
    SELECT f.id, f.question, f.answer, f.topic, f.difficulty, f.card_type, f.timestamp_ref,
           f.is_known, f.is_difficult, sp.repetitions, sp.ease_factor, sp.interval_days, sp.next_review_at
    FROM flashcards f
    LEFT JOIN study_progress sp ON f.id = sp.flashcard_id AND sp.user_id = ?
    WHERE f.lecture_id = ?
    ORDER BY f.order_index ASC
  `).all(userId, lectureId);

  res.json({ flashcards: cards });
});

/**
 * Get all flashcards due for review across all lectures.
 */
router.get('/flashcards/due', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const now = new Date().toISOString();

  const cards = db.prepare(`
    SELECT f.id, f.lecture_id, f.question, f.answer, f.topic, f.difficulty, f.card_type,
           sp.repetitions, sp.interval_days, sp.ease_factor, sp.next_review_at
    FROM flashcards f
    JOIN study_progress sp ON f.id = sp.flashcard_id
    WHERE sp.user_id = ? AND sp.next_review_at <= ?
    ORDER BY sp.next_review_at ASC
    LIMIT 100
  `).all(userId, now);

  res.json({ dueCards: cards });
});

/**
 * Manually create a custom flashcard.
 */
router.post('/flashcards', (req: Request, res: Response) => {
  const { lectureId, question, answer, topic, difficulty, cardType } = req.body;
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const cardId = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(`
    INSERT INTO flashcards (id, lecture_id, user_id, question, answer, topic, difficulty, card_type, is_known, is_difficult, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 999, ?)
  `).run(cardId, lectureId, userId, question, answer, topic || 'General', difficulty || 'medium', cardType || 'concept_explanation', now);

  // Initialize study progress
  db.prepare(`
    INSERT INTO study_progress (id, user_id, flashcard_id, repetitions, interval_days, ease_factor, next_review_at)
    VALUES (?, ?, ?, 0, 0, 2.5, ?)
  `).run(crypto.randomUUID(), userId, cardId, now);

  res.status(201).json({ message: 'Flashcard created', cardId });
});

/**
 * Edit a flashcard.
 */
router.put('/flashcards/:id', (req: Request, res: Response) => {
  const cardId = String(req.params.id);
  const userId = req.user!.id;
  assertFlashcardOwnership(cardId, userId);

  const { question, answer, topic, difficulty, cardType } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE flashcards
    SET question = ?, answer = ?, topic = ?, difficulty = ?, card_type = ?
    WHERE id = ?
  `).run(question, answer, topic, difficulty, cardType, cardId);

  res.json({ message: 'Flashcard updated' });
});

/**
 * Delete a flashcard.
 */
router.delete('/flashcards/:id', (req: Request, res: Response) => {
  const cardId = String(req.params.id);
  const userId = req.user!.id;
  assertFlashcardOwnership(cardId, userId);

  const db = getDb();
  db.prepare('DELETE FROM flashcards WHERE id = ?').run(cardId);
  res.json({ message: 'Flashcard deleted' });
});

/**
 * Review a flashcard (Spaced Repetition rating).
 */
router.post('/flashcards/:id/review', (req: Request, res: Response) => {
  const cardId = String(req.params.id);
  const userId = req.user!.id;
  assertFlashcardOwnership(cardId, userId);

  const rating = Number(req.body.rating) as ReviewRating;
  if (![1, 2, 3, 4].includes(rating)) {
    res.status(400).json({ error: 'Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)' });
    return;
  }

  reviewFlashcard(cardId, userId, rating);
  res.json({ message: 'Review recorded successfully' });
});

/**
 * Get quizzes for a lecture.
 */
router.get('/lectures/:id/quizzes', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const db = getDb();
  const quizSets = db.prepare(`
    SELECT id, title, created_at FROM quiz_sets WHERE lecture_id = ?
  `).all(lectureId) as Array<{ id: string; title: string; created_at: string }>;

  const setsWithQuestions = quizSets.map((qs) => {
    const questions = db.prepare(`
      SELECT id, question, question_type, options_json, difficulty, topic, timestamp_ref, order_index
      FROM quiz_questions WHERE quiz_set_id = ?
      ORDER BY order_index ASC
    `).all(qs.id).map((q: any) => ({
      ...q,
      options: JSON.parse(q.options_json || '[]'),
    }));

    const attempts = db.prepare(`
      SELECT id, score, total_questions, weak_topics_json, completed_at
      FROM quiz_attempts WHERE quiz_set_id = ?
      ORDER BY completed_at DESC
    `).all(qs.id).map((a: any) => ({
      ...a,
      weakTopics: JSON.parse(a.weak_topics_json || '[]'),
    }));

    return {
      ...qs,
      questions,
      attempts,
    };
  });

  res.json({ quizSets: setsWithQuestions });
});

/**
 * Submit quiz answers and receive score and explanations.
 */
router.post('/quizzes/:id/submit', (req: Request, res: Response) => {
  const quizSetId = String(req.params.id);
  const userId = req.user!.id;
  assertQuizOwnership(quizSetId, userId);

  const userAnswers = req.body.answers || {};
  const result = submitQuizAttempt(quizSetId, userId, userAnswers);

  res.json({ result });
});

/**
 * Get aggregated student study progress and metrics.
 */
router.get('/progress', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();
  const now = new Date().toISOString();

  // Lectures count
  const lecturesCount = (db.prepare('SELECT COUNT(*) as count FROM lectures WHERE user_id = ?').get(userId) as any).count;

  // Flashcards total and due
  const totalCards = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE user_id = ?').get(userId) as any).count;
  const dueCards = (db.prepare('SELECT COUNT(*) as count FROM study_progress WHERE user_id = ? AND next_review_at <= ?').get(userId, now) as any).count;
  const masteredCards = (db.prepare('SELECT COUNT(*) as count FROM study_progress WHERE user_id = ? AND repetitions >= 3').get(userId) as any).count;

  // Quiz statistics
  const attempts = db.prepare(`
    SELECT score, total_questions, weak_topics_json, completed_at
    FROM quiz_attempts WHERE user_id = ?
    ORDER BY completed_at DESC
  `).all(userId) as Array<{ score: number; total_questions: number; weak_topics_json: string; completed_at: string }>;

  let totalQuestionsAnswered = 0;
  let totalScore = 0;
  const allWeakTopics: Record<string, number> = {};

  for (const a of attempts) {
    totalQuestionsAnswered += a.total_questions;
    totalScore += a.score;
    const weaks: string[] = JSON.parse(a.weak_topics_json || '[]');
    for (const w of weaks) {
      allWeakTopics[w] = (allWeakTopics[w] || 0) + 1;
    }
  }

  const averageScore = totalQuestionsAnswered > 0 ? Math.round((totalScore / totalQuestionsAnswered) * 100) : 0;
  const topWeakTopics = Object.entries(allWeakTopics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  res.json({
    metrics: {
      lecturesCount,
      totalCards,
      dueCards,
      masteredCards,
      totalQuizAttempts: attempts.length,
      averageScore,
      topWeakTopics,
    },
    recentAttempts: attempts.slice(0, 5),
  });
});

/**
 * Export lecture materials (Markdown, JSON, Plain Text).
 */
router.get('/lectures/:id/export', (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const userId = req.user!.id;
  assertLectureOwnership(lectureId, userId);

  const format = (req.query.format as string || 'markdown').toLowerCase();
  const bundle = getLectureExportBundle(lectureId);

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${bundle.lecture.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.json"`);
    res.send(JSON.stringify(bundle, null, 2));
  } else if (format === 'text' || format === 'txt') {
    const text = exportToPlainText(bundle);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${bundle.lecture.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.txt"`);
    res.send(text);
  } else {
    // Default markdown
    const md = exportToMarkdown(bundle);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${bundle.lecture.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md"`);
    res.send(md);
  }
});

export default router;
