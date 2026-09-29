import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import { config } from '../config';
import { logger } from '../security/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new secure session for a user.
 * Stores a hash of the token in SQLite.
 * Returns the raw token to set in the HttpOnly cookie.
 */
export function createSession(userId: string, userAgent?: string): { token: string; expiresAt: Date } {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + config.sessionTtlHours);

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, expiresAt.toISOString(), now, userAgent || null);

  return { token, expiresAt };
}

/**
 * Revokes an individual session by token.
 */
export function revokeSession(token: string): boolean {
  const db = getDb();
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL
  `).run(now, tokenHash);

  return result.changes > 0;
}

/**
 * Revokes all sessions for a given user (e.g. after password change).
 */
export function revokeAllUserSessions(userId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL
  `).run(now, userId);
}

/**
 * Express middleware to authenticate the user via cookie or Bearer token.
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  let token = req.cookies?.session_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const tokenHash = hashToken(token);
  const db = getDb();

  const sessionRow = db.prepare(`
    SELECT s.id as session_id, s.expires_at, s.revoked_at, u.id as user_id, u.email, u.name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ?
  `).get(tokenHash) as {
    session_id: string;
    expires_at: string;
    revoked_at: string | null;
    user_id: string;
    email: string;
    name: string;
  } | undefined;

  if (!sessionRow) {
    res.status(401).json({ error: 'Invalid session. Please log in again.' });
    return;
  }

  if (sessionRow.revoked_at) {
    res.status(401).json({ error: 'Session has been revoked. Please log in again.' });
    return;
  }

  if (new Date(sessionRow.expires_at) < new Date()) {
    res.status(401).json({ error: 'Session has expired. Please log in again.' });
    return;
  }

  req.user = {
    id: sessionRow.user_id,
    email: sessionRow.email,
    name: sessionRow.name,
  };
  req.sessionId = sessionRow.session_id;

  next();
}
