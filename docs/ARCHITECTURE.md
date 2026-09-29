# Architecture & Technical Design

## 1. System Overview

LocalLecture is built on a local-first, privacy-by-design architecture. The frontend runs in any modern browser, communicating solely with the local Node.js server (`http://127.0.0.1:3001`). No data is ever transmitted to cloud servers.

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                            │
│  (React 18, TypeScript, Tailwind CSS, MediaRecorder API)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (Localhost only)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js Express Backend                     │
│  ├── Authentication & Session Management (Argon2id + SHA256) │
│  ├── Incremental Audio Streaming & Storage Engine          │
│  ├── Pipeline Orchestrator & Crash Recovery                 │
│  └── Study Material Synthesizers (Notes, Flashcards, Quiz) │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│       SQLite Database        │ │    Local AI Runtimes        │
│  (Native node:sqlite WAL)    │ │  ├── Local Whisper (Python) │
│  ├── Users & Sessions        │ │  ├── Ollama (Port 11434)    │
│  ├── Lectures & Audio Files  │ │  ├── llama.cpp (Port 8080)  │
│  ├── Transcripts & Segments  │ │  └── Built-in Smart Fallback│
│  └── Notes, Cards, Quizzes   │ └─────────────────────────────┘
└──────────────────────────────┘
```

---

## 2. Directory Layout

```
wise-tesla/
├── backend/
│   ├── config.ts              # Zod-validated configuration & directories
│   ├── index.ts               # Express entry point, security headers, routing
│   ├── auth/                  # Argon2id password hashing, session tokens, auth routes
│   ├── database/              # Schema definitions and node:sqlite connection manager
│   ├── security/              # Audit logger, path sanitizers, ownership guards
│   ├── recording/             # Disk chunk streaming and audio management
│   ├── transcription/         # Whisper runner and transcription service
│   ├── ai/                    # LLM providers, chunker, JSON validation, schemas
│   ├── study/                 # Note generator, SM-2 flashcard logic, quiz grader, exporter
│   ├── services/              # Pipeline state machine and git sync service
│   └── routes/                # Lecture, study, settings, and sync endpoints
├── frontend/
│   ├── index.html             # Single-page application entry HTML
│   └── src/
│       ├── main.tsx           # React DOM root render
│       ├── App.tsx            # Main shell, routing, session listener
│       ├── index.css          # Tailwind CSS directives
│       ├── types/             # Shared TypeScript models and interfaces
│       ├── api/               # Typed client API layer
│       ├── components/        # AudioRecorder, NotesEditor, FlashcardDeck, QuizRunner, etc.
│       └── pages/             # Dashboard, Lectures, LectureDetail, Flashcards, Quizzes, etc.
├── prompts/                   # Structured prompts for summarization, notes, cards, quizzes
├── scripts/                   # CLI repository synchronizer and Python Whisper runner
├── tests/                     # Unit, security, and end-to-end integration tests
└── docs/                      # Technical documentation
```

---

## 3. Data Processing Pipeline

When a lecture recording finishes or an audio file is processed, the system initiates an asynchronous state machine:

```
[RECORDED] ──> [TRANSCRIBING] ──> [TRANSCRIBED] ──> [ANALYZING]
                                                         │
   ┌─────────────────────────────────────────────────────┘
   ▼
[GENERATING_NOTES] ──> [GENERATING_FLASHCARDS] ──> [GENERATING_QUIZ] ──> [COMPLETE]
```

### Crash Recovery
If the server restarts or crashes during processing:
- On startup, `recoverInterruptedJobs()` identifies lectures left in intermediary states.
- It verifies audio availability and resumes execution from the last safe checkpoint, preventing stuck states or data loss.

---

## 4. Spaced Repetition (SuperMemo SM-2)

Flashcards are managed using the SM-2 algorithm:
- **Repetitions (n)**: Number of consecutive successful recalls.
- **Interval (I)**: Days until next review (`I(1) = 1`, `I(2) = 6`, `I(n) = I(n-1) * EF`).
- **Ease Factor (EF)**: Dynamically adjusted based on the user rating:
  `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`
- Ratings:
  - 1: **Again** (Reset repetitions, interval = 0)
  - 2: **Hard** (Interval = 1 day)
  - 3: **Good** (Standard interval increase)
  - 4: **Easy** (Accelerated interval increase)
