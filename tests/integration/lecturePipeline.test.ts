import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { getDb, initDatabase } from '../../backend/database/db';
import { appendAudioChunk, finalizeAudioRecording } from '../../backend/recording/audioService';
import { runFullLecturePipeline } from '../../backend/services/pipeline';
import { getLectureExportBundle, exportToMarkdown } from '../../backend/study/exportService';
import { submitQuizAttempt } from '../../backend/study/quizGenerator';

describe('End-to-End Lecture Processing Pipeline', () => {
  let testUserId: string;
  let testLectureId: string;

  beforeEach(() => {
    initDatabase();
    const db = getDb();
    testUserId = crypto.randomUUID();
    testLectureId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, 'fakehash', 'Physics Student', ?, ?)
    `).run(testUserId, `student-${Date.now()}@test.edu`, now, now);

    db.prepare(`
      INSERT INTO lectures (id, user_id, title, subject, status, created_at, updated_at)
      VALUES (?, ?, 'Classical Mechanics & Dynamics', 'Physics', 'RECORDING', ?, ?)
    `).run(testLectureId, testUserId, now, now);
  });

  it('runs complete pipeline from recording to notes, flashcards, quizzes, and exports', async () => {
    // 1. Simulate streaming audio chunk upload
    const dummyAudioChunk = Buffer.from('RIFF....WAVEfmt ....data....sampleaudiobytes');
    await appendAudioChunk(testLectureId, dummyAudioChunk, 'webm');

    // 2. Finalize recording
    const audioInfo = await finalizeAudioRecording(testLectureId, 180, 'webm');
    expect(audioInfo.durationSeconds).toBe(180);
    expect(audioInfo.fileSize).toBeGreaterThan(0);

    // 3. Execute full pipeline
    await runFullLecturePipeline(testLectureId, testUserId);

    const db = getDb();

    // Verify lecture status is COMPLETE
    const lecture = db.prepare('SELECT status FROM lectures WHERE id = ?').get(testLectureId) as { status: string };
    expect(lecture.status).toBe('COMPLETE');

    // Verify transcript exists
    const transcript = db.prepare('SELECT id, full_text FROM transcripts WHERE lecture_id = ?').get(testLectureId) as any;
    expect(transcript).toBeDefined();
    expect(transcript.full_text).toContain('Newton');

    // Verify transcript segments
    const segments = db.prepare('SELECT COUNT(*) as count FROM transcript_segments WHERE transcript_id = ?').get(transcript.id) as any;
    expect(segments.count).toBeGreaterThan(0);

    // Verify notes and sections
    const notes = db.prepare('SELECT id, title, summary, key_concepts FROM notes WHERE lecture_id = ?').get(testLectureId) as any;
    expect(notes).toBeDefined();
    expect(notes.title).toBeDefined();
    const sections = db.prepare('SELECT COUNT(*) as count FROM note_sections WHERE note_id = ?').get(notes.id) as any;
    expect(sections.count).toBeGreaterThan(0);

    // Verify flashcards
    const flashcards = db.prepare('SELECT id, question, answer FROM flashcards WHERE lecture_id = ?').all(testLectureId);
    expect(flashcards.length).toBeGreaterThan(0);

    // Verify quiz set and questions
    const quizSet = db.prepare('SELECT id FROM quiz_sets WHERE lecture_id = ?').get(testLectureId) as any;
    expect(quizSet).toBeDefined();
    const quizQuestions = db.prepare('SELECT id, question, correct_answer FROM quiz_questions WHERE quiz_set_id = ?').all(quizSet.id) as any[];
    expect(quizQuestions.length).toBeGreaterThan(0);

    // 4. Test quiz submission
    const answers: Record<string, string> = {};
    for (const q of quizQuestions) {
      answers[q.id] = q.correct_answer; // Perfect score
    }

    const quizResult = submitQuizAttempt(quizSet.id, testUserId, answers);
    expect(quizResult.score).toBe(quizQuestions.length);
    expect(quizResult.percentage).toBe(100);

    // 5. Test Export
    const bundle = getLectureExportBundle(testLectureId);
    const markdownExport = exportToMarkdown(bundle);
    expect(markdownExport).toContain('## Overview & Summary');
    expect(markdownExport).toContain('## Flashcard Study Deck');
    expect(markdownExport).toContain('## Full Transcript');
  });
});
