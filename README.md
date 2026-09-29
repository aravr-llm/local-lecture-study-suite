# LocalLecture — Privacy-First AI Lecture & Study Suite

LocalLecture is a complete, production-quality desktop web application that records lectures locally, transcribes them using **local speech-to-text (Whisper)**, and automatically generates structured study materials—including comprehensive notes, flashcards with spaced repetition (SM-2), and practice quizzes—using **local AI** (Ollama / llama.cpp).

Zero cloud subscriptions. Zero telemetry. 100% data privacy.

---

## Key Highlights

- **Local Microphone Recording**: Record with pause/resume/stop, live audio visualizer, input device selection, and incremental disk streaming.
- **Scrubbable Audio & Timestamps**: HTTP Range audio player with clickable transcript timestamps that seek and play audio from any segment.
- **Local Speech-to-Text**: Python Whisper runner with built-in offline speech provider fallback.
- **Local AI Study Synthesizer**: Connects to local Ollama or llama.cpp to extract summaries, key concepts, definitions, study questions, and practice exams.
- **Spaced Repetition Flashcards**: SuperMemo SM-2 algorithm scheduling cards with Again/Hard/Good/Easy review intervals.
- **Practice Quizzes**: Multiple-choice and open-ended quizzes with automatic grading and weak topic tracking.
- **Private GitHub Sync**: Built-in secret scanner and GitHub API sync tool to push clean source code to your private repository without exposing audio, database, or credentials.
- **Argon2id Authentication**: Cryptographically salted passwords and SHA-256 session token hashing.

---

## Quick Start

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Run in Development Mode
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run in Production Mode
```bash
npm start
```
Open [http://127.0.0.1:3001](http://127.0.0.1:3001) in your browser.

---

## Documentation

- [Architecture & Design Details](docs/ARCHITECTURE.md)
- [Security & Threat Model](docs/SECURITY.md)
- [Privacy Guarantee & Policy](docs/PRIVACY.md)
- [Local AI & Whisper Setup](docs/LOCAL_AI.md)
- [Setup & Troubleshooting](docs/SETUP.md)
- [Development Status & Milestones](docs/DEVELOPMENT_STATUS.md)

---

## Automated Tests

Run the full Vitest suite (26 unit, integration, and security tests):
```bash
npm test
```
