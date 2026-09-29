# LocalLecture Setup & Getting Started Guide

## Prerequisites

- **Node.js**: v20.x or v24.x (v24.x recommended, tested on Node 24.19.0).
- **npm**: v10+ (included with Node.js).
- **Python** *(Optional, for local Whisper)*: Python 3.10+.
- **Ollama** *(Optional, for local LLM)*: [https://ollama.com](https://ollama.com).

---

## 1. Quick Start (Development Mode)

### Step 1: Clone or Open Codebase
Ensure you are in the project root directory:
```bash
cd wise-tesla
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Full Development Suite
Run both backend and frontend concurrently with live reloading:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://127.0.0.1:3001](http://127.0.0.1:3001)

---

## 2. Production Build & Run

### Step 1: Build Frontend and Verify Backend Types
```bash
npm run build
```
This compiles the React/Tailwind frontend into `dist/frontend/` and typechecks the backend TypeScript.

### Step 2: Start the Production Server
```bash
npm start
```
The server serves the compiled frontend assets directly on `http://127.0.0.1:3001`.

---

## 3. Running Automated Tests

Run the full Vitest automated test suite:
```bash
npm test
```
Runs:
- Unit tests: Argon2id password security, session lifecycle, SQLite constraints, chunking, SM-2 algorithms, secret scanning.
- Security tests: Path traversal resistance, extension whitelist, SQL injection protection, multi-tenant isolation, adversarial LLM output handling.
- Integration tests: Complete end-to-end recording -> transcription -> notes -> flashcards -> quiz generation pipeline.
