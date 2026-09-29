import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../backend/auth/password';
import { getDb, initDatabase } from '../../backend/database/db';
import { createSession, revokeSession } from '../../backend/auth/session';
import crypto from 'crypto';

describe('Authentication & Password Security', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('validates password strength rules', () => {
    expect(validatePasswordStrength('short').isValid).toBe(false);
    expect(validatePasswordStrength('onlyletters').isValid).toBe(false);
    expect(validatePasswordStrength('12345678').isValid).toBe(false);
    expect(validatePasswordStrength('ValidPass123!').isValid).toBe(true);
  });

  it('hashes passwords using Argon2id with salt and verifies correctly', async () => {
    const password = 'SuperSecretLecturePassword2026!';
    const hash = await hashPassword(password);

    expect(hash).toContain('$argon2id$');
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('generates unique hashes for identical passwords due to random salting', async () => {
    const password = 'SamePasswordTwice1!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toEqual(hash2);
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('creates and revokes user sessions', () => {
    const db = getDb();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, `test-${Date.now()}@example.com`, 'fakehash', 'Test Student', now, now);

    const { token, expiresAt } = createSession(userId, 'Vitest-Agent');
    expect(token).toBeDefined();
    expect(token.length).toBe(64);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Revoke session
    const revoked = revokeSession(token);
    expect(revoked).toBe(true);
  });
});
