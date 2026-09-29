import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  port: z.number().default(3001),
  host: z.string().default('127.0.0.1'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  databasePath: z.string().default('./data/local_lecture.db'),
  storageDir: z.string().default('./data'),
  localAiProvider: z.enum(['ollama', 'llamacpp', 'mock']).default('ollama'),
  localAiUrl: z.string().url().default('http://localhost:11434'),
  localAiModel: z.string().default('llama3.2'),
  localAiTimeoutMs: z.number().default(120000),
  whisperProvider: z.enum(['local', 'python', 'mock']).default('local'),
  whisperModel: z.string().default('base'),
  whisperLanguage: z.string().default('en'),
  sessionSecret: z.string().min(16),
  sessionTtlHours: z.number().default(168), // 7 days
  enableTelemetry: z.boolean().default(false),
  allowExternalAi: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

function getOrCreateSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  // If not provided in environment, generate a cryptographically strong 32-byte secret
  const secretFile = path.resolve(process.cwd(), 'data', '.session_secret');
  if (fs.existsSync(secretFile)) {
    try {
      const saved = fs.readFileSync(secretFile, 'utf-8').trim();
      if (saved.length >= 32) return saved;
    } catch {
      // Fall through to generate
    }
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(secretFile, generated, { encoding: 'utf-8', mode: 0o600 });
  } catch {
    // Non-fatal if cannot persist file, will remain in memory
  }
  return generated;
}

const rawConfig = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  databasePath: process.env.DATABASE_PATH || './data/local_lecture.db',
  storageDir: process.env.STORAGE_DIR || './data',
  localAiProvider: (process.env.LOCAL_AI_PROVIDER as 'ollama' | 'llamacpp' | 'mock') || 'ollama',
  localAiUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434',
  localAiModel: process.env.LOCAL_AI_MODEL || 'llama3.2',
  localAiTimeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS) || 120000,
  whisperProvider: (process.env.WHISPER_PROVIDER as 'local' | 'python' | 'mock') || 'local',
  whisperModel: process.env.WHISPER_MODEL || 'base',
  whisperLanguage: process.env.WHISPER_LANGUAGE || 'en',
  sessionSecret: getOrCreateSessionSecret(),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS) || 168,
  enableTelemetry: process.env.ENABLE_TELEMETRY === 'true',
  allowExternalAi: false, // Strictly false: never allowed
};

export const config = ConfigSchema.parse(rawConfig);

// Ensure essential directories exist locally
export const DATA_DIR = path.resolve(process.cwd(), config.storageDir);
export const RECORDINGS_DIR = path.join(DATA_DIR, 'recordings');
export const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
export const TRANSCRIPTS_DIR = path.join(DATA_DIR, 'transcripts');

for (const dir of [DATA_DIR, RECORDINGS_DIR, EXPORTS_DIR, TRANSCRIPTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
