import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, initDatabase } from '../../backend/database/db';
import crypto from 'crypto';

describe('Database Architecture & Constraints', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('initializes all essential tables', () => {
    const db = getDb();
    const tables = [
      'users',
      'sessions',
      'lectures',
      'audio_files',
      'transcripts',
      'transcript_segments',
      'notes',
      'note_sections',
      'flashcards',
      'quiz_sets',
      'quiz_questions',
      'quiz_attempts',
      'quiz_answers',
      'study_progress',
      'app_settings',
      'audit_logs',
    ];

    for (const table of tables) {
      const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      expect(row, `Table ${table} should exist`).toBeDefined();
    }
  });

  it('enforces foreign key constraints', () => {
    const db = getDb();
    const invalidUserId = crypto.randomUUID();

    // Attempting to insert a lecture with non-existent user should fail due to foreign key
    expect(() => {
      db.prepare(`
        INSERT INTO lectures (id, user_id, title, subject, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), invalidUserId, 'Physics 101', 'Physics', new Date().toISOString(), new Date().toISOString());
    }).toThrow();
  });
});
