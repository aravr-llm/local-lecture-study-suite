export const SCHEMA_SQL = `
-- ============================================================================
-- LocalLecture Relational SQLite Database Schema
-- All tables enforce foreign keys and indexing on high-cardinality queries.
-- ============================================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Sessions (Secure Session Management)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- 3. Lectures
CREATE TABLE IF NOT EXISTS lectures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RECORDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lectures_user_id ON lectures(user_id);
CREATE INDEX IF NOT EXISTS idx_lectures_status ON lectures(status);

-- 4. Audio Files (Local audio metadata)
CREATE TABLE IF NOT EXISTS audio_files (
  id TEXT PRIMARY KEY,
  lecture_id TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

-- 5. Transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  lecture_id TEXT UNIQUE NOT NULL,
  full_text TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  is_cleaned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

-- 6. Transcript Segments (Timestamped intervals)
CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_segments_transcript_id ON transcript_segments(transcript_id);
CREATE INDEX IF NOT EXISTS idx_segments_times ON transcript_segments(transcript_id, start_time);

-- 7. Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  lecture_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_concepts TEXT NOT NULL,      -- JSON array
  definitions TEXT NOT NULL,       -- JSON array
  important_facts TEXT NOT NULL,   -- JSON array
  uncertainties TEXT NOT NULL,     -- JSON array
  study_questions TEXT NOT NULL,   -- JSON array
  is_custom_edited INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

-- 8. Note Sections (Hierarchical topic breakdowns)
CREATE TABLE IF NOT EXISTS note_sections (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  content TEXT NOT NULL,
  examples TEXT,
  terminology TEXT,
  timestamp_start REAL,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_note_sections_note_id ON note_sections(note_id);

-- 9. Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  card_type TEXT NOT NULL DEFAULT 'concept',
  timestamp_ref REAL,
  is_known INTEGER DEFAULT 0,
  is_difficult INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_flashcards_lecture_id ON flashcards(lecture_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);

-- 10. Study Progress (Spaced Repetition / SM-2 state)
CREATE TABLE IF NOT EXISTS study_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  flashcard_id TEXT UNIQUE NOT NULL,
  repetitions INTEGER DEFAULT 0,
  interval_days REAL DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  next_review_at TEXT NOT NULL,
  last_reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_study_progress_review ON study_progress(user_id, next_review_at);

-- 11. Quiz Sets
CREATE TABLE IF NOT EXISTS quiz_sets (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quiz_sets_lecture ON quiz_sets(lecture_id);

-- 12. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_set_id TEXT NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options_json TEXT NOT NULL,    -- JSON array of options
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  topic TEXT NOT NULL,
  timestamp_ref REAL,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_set ON quiz_questions(quiz_set_id);

-- 13. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_set_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  weak_topics_json TEXT,         -- JSON array
  completed_at TEXT NOT NULL,
  FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

-- 14. Quiz Answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON quiz_answers(attempt_id);

-- 15. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  component TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
`;
