# Privacy Guarantee & Local Processing Policy

## 1. Zero Cloud Policy

LocalLecture was designed from inception for total data sovereignty. In educational and academic environments, lectures may contain sensitive intellectual property, unreleased research findings, personal opinions, or medical details.

- **Audio Stays Local**: Audio is recorded through your browser MediaStream API and written directly to your local drive (`data/recordings/`).
- **Transcription Stays Local**: Whisper speech-to-text models execute locally on your CPU/GPU. No audio bytes leave your device.
- **LLM Stays Local**: Summaries, notes, flashcards, and quizzes are synthesized via local LLM engines (Ollama or llama.cpp). No prompts or outputs are sent to OpenAI, Anthropic, Google, or any cloud API.
- **No Analytics / No Telemetry**: LocalLecture contains zero tracking pixels, telemetry probes, diagnostic crash reporters, or external analytics scripts.

---

## 2. Privacy Banner & Real-time Verification

The application features an interactive **Privacy Banner** at the top of the interface:
- Provides continuous visual confirmation of local execution mode.
- Users can click **Verify Privacy Diagnostics** at any time to inspect:
  - Active Speech-to-Text engine.
  - Active LLM runtime.
  - Absence of external service connections.
  - Exact storage size and directory path of recordings.

---

## 3. Account Deletion & Right to be Forgotten

Users can delete their entire account and all associated data at any time via **Settings > Danger Zone**:
- Deleting an account executes a cascade purge:
  - Deletes all user lecture records.
  - Deletes all audio files from disk.
  - Deletes all generated transcripts and segments.
  - Deletes all notes, custom edits, flashcards, study progress, quizzes, and attempts.
  - Deletes session tokens and audit logs.
