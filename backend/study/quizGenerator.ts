import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../database/db';
import { AIProviderFactory } from '../ai/provider';
import { buildQuizPrompt } from '../../prompts/quiz';
import { QuizQuestionItem, QuizQuestionSchema } from '../ai/types';
import { logger } from '../security/logger';

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  weakTopics: string[];
  results: Array<{
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    topic: string;
  }>;
}

export async function generateQuiz(lectureId: string, userId: string): Promise<string> {
  const db = getDb();

  const transcriptRow = db.prepare('SELECT full_text FROM transcripts WHERE lecture_id = ?').get(lectureId) as {
    full_text: string;
  } | undefined;

  if (!transcriptRow) {
    throw new Error('Transcript not found for this lecture');
  }

  const provider = await AIProviderFactory.getProvider();
  logger.info('QuizGenerator', `Generating quiz using provider: ${provider.name}`, { lectureId });

  const prompt = buildQuizPrompt(transcriptRow.full_text);
  const questions = await provider.generateStructured(prompt, z.array(QuizQuestionSchema));

  const quizSetId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO quiz_sets (id, lecture_id, user_id, title, created_at)
      VALUES (?, ?, ?, 'Practice Exam & Self-Assessment', ?)
    `).run(quizSetId, lectureId, userId, now);

    const insertQ = db.prepare(`
      INSERT INTO quiz_questions (
        id, quiz_set_id, question, question_type, options_json,
        correct_answer, explanation, difficulty, topic, timestamp_ref, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    questions.forEach((q: QuizQuestionItem, idx: number) => {
      insertQ.run(
        crypto.randomUUID(),
        quizSetId,
        q.question,
        q.questionType ?? 'multiple_choice',
        JSON.stringify(q.options),
        q.correctAnswer,
        q.explanation,
        q.difficulty ?? 'medium',
        q.topic ?? 'General',
        q.timestamp ?? 0,
        idx
      );
    });

    db.exec('COMMIT;');
    logger.info('QuizGenerator', `Successfully generated quiz with ${questions.length} questions`, { quizSetId });
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return quizSetId;
}

export function submitQuizAttempt(
  quizSetId: string,
  userId: string,
  userAnswers: Record<string, string>
): QuizSubmissionResult {
  const db = getDb();

  const questions = db.prepare(`
    SELECT id, question, question_type, correct_answer, explanation, topic
    FROM quiz_questions
    WHERE quiz_set_id = ?
    ORDER BY order_index ASC
  `).all(quizSetId) as Array<{
    id: string;
    question: string;
    question_type: string;
    correct_answer: string;
    explanation: string;
    topic: string;
  }>;

  let score = 0;
  const incorrectTopics = new Map<string, number>();
  const results: QuizSubmissionResult['results'] = [];

  for (const q of questions) {
    const rawUserAnswer = (userAnswers[q.id] || '').trim();
    let isCorrect = false;

    if (q.question_type === 'short_answer') {
      // Flexible matching for short answers
      const normUser = rawUserAnswer.toLowerCase();
      const normCorrect = q.correct_answer.toLowerCase();
      isCorrect = normUser.includes(normCorrect) || normCorrect.includes(normUser);
    } else {
      isCorrect = rawUserAnswer.toLowerCase() === q.correct_answer.toLowerCase();
    }

    if (isCorrect) {
      score += 1;
    } else {
      incorrectTopics.set(q.topic, (incorrectTopics.get(q.topic) || 0) + 1);
    }

    results.push({
      questionId: q.id,
      question: q.question,
      userAnswer: rawUserAnswer,
      correctAnswer: q.correct_answer,
      isCorrect,
      explanation: q.explanation,
      topic: q.topic,
    });
  }

  // Identify weak topics (topics with most misses)
  const weakTopics = Array.from(incorrectTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  const attemptId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO quiz_attempts (id, quiz_set_id, user_id, score, total_questions, weak_topics_json, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(attemptId, quizSetId, userId, score, questions.length, JSON.stringify(weakTopics), now);

    const insertAnswer = db.prepare(`
      INSERT INTO quiz_answers (id, attempt_id, question_id, user_answer, is_correct)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const r of results) {
      insertAnswer.run(crypto.randomUUID(), attemptId, r.questionId, r.userAnswer, r.isCorrect ? 1 : 0);
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return {
    attemptId,
    score,
    totalQuestions: questions.length,
    percentage,
    weakTopics,
    results,
  };
}
