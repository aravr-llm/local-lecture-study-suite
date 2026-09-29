# Security & Threat Model

## 1. Core Security Principles

LocalLecture is designed with defense-in-depth principles appropriate for processing sensitive audio, classroom conversations, and personal study data:

1. **Zero-Trust Network Perimeter**: The backend binds exclusively to `127.0.0.1` and does not accept remote network traffic.
2. **Zero Cloud AI Leakage**: No audio, transcript, or generated text is ever dispatched to external cloud APIs (OpenAI, Anthropic, Google, etc.).
3. **Multi-Tenant Separation**: All queries, mutations, and file accesses enforce explicit resource ownership checks keyed by the authenticated user ID.
4. **Least Privilege & Sanitization**: Strict input validation on every ID, parameter, and file path.

---

## 2. Authentication & Passwords

### Password Hashing (Argon2id)
- Passwords are encrypted using Argon2id via `hash-wasm`.
- Configuration:
  - Iterations: `3`
  - Memory Cost: `65536 KB` (64 MB)
  - Parallelism: `1`
  - Hash Length: `32 bytes`
- Automatic per-password random salt generation prevents rainbow table attacks.
- Minimum password length: 12 characters.

### Session Management
- Sessions use cryptographically secure 32-byte random tokens generated via `crypto.randomBytes(32)`.
- The raw token is delivered to the browser in an `HttpOnly`, `SameSite=Lax`, secure cookie (`session_token`).
- In SQLite, only the **SHA-256 hash** of the token is stored (`sessions.token_hash`), preventing session hijacking even if the database file is read.
- Sessions automatically expire after 30 days of inactivity.

---

## 3. Path Traversal & File Upload Security

Audio chunk uploads and file requests are protected by `backend/security/sanitizer.ts`:
- **UUID Validation**: File identifiers must strictly match UUIDv4 format (`[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`).
- **Extension Whitelist**: Only allowed audio formats (`.webm`, `.wav`, `.mp3`, `.m4a`, `.ogg`) are accepted.
- **Directory Traversal Prevention**: Normalized paths must resolve within `data/recordings/`. Any path containing `..`, null bytes, or separators is rejected.

---

## 4. Redacting Structured Logger

The application uses a custom logger (`backend/security/logger.ts`):
- Password fields, session tokens, authorization headers, and raw audio payloads are automatically scrubbed before writing to logs.
- Sensitive lecture transcripts are omitted or replaced with length/status metadata.
- Prevents accidental exposure of personal data in terminal output or log files.

---

## 5. Pre-Sync Secret Scanner

Before publishing code to any Git repository:
- `backend/services/gitSyncService.ts` executes an automated security scan.
- Scans for:
  - SQLite database files (`*.db`, `*.sqlite`)
  - Audio recording media (`*.webm`, `*.wav`, `*.mp3`, etc.)
  - Private keys (`BEGIN RSA PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, etc.)
  - Environment files containing credentials (`.env`, `.session_secret`)
  - Authentication tokens (GitHub tokens, API keys)
- Pushing is blocked if any violation is detected.
