import path from 'path';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Ensures that a requested file path resolves strictly within the allowed base directory.
 * Throws an error if a path traversal attempt is detected.
 */
export function assertSafePath(baseDir: string, relativeOrAbsolute: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativeOrAbsolute);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error('Access denied: Path traversal detected');
  }

  return resolvedTarget;
}

/**
 * Validates audio file extension and MIME type against permitted whitelist.
 */
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac', '.mp4']);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'video/webm', // MediaRecorder often labels webm as video/webm even when audio only
]);

export function isAllowedAudio(extension: string, mimeType?: string): boolean {
  const ext = extension.toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return false;
  }
  if (mimeType && !ALLOWED_AUDIO_MIMES.has(mimeType.toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * Clean user text input to strip control characters while preserving unicode letters and markdown.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  // Strip null bytes and dangerous ASCII control characters
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}
