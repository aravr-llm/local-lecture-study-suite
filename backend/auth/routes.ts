import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../database/db';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password';
import { createSession, revokeSession, revokeAllUserSessions, authenticateUser } from './session';
import { logger } from '../security/logger';
import { config } from '../config';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Check if the application has at least one registered user (first-run check).
 */
router.get('/status', (req: Request, res: Response) => {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  res.json({
    initialized: countRow.count > 0,
    userCount: countRow.count,
  });
});

/**
 * Register a new user securely.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() });
      return;
    }

    const { email, password, name } = parseResult.data;

    // Validate password complexity
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.isValid) {
      res.status(400).json({ error: strengthCheck.message });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name.trim(), now, now);

    logger.info('Auth', 'User registered successfully', { userId });

    const userAgent = req.headers['user-agent'];
    const { token, expiresAt } = createSession(userId, userAgent);
    setSessionCookie(res, token, expiresAt);

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: userId, email: email.toLowerCase(), name: name.trim() },
    });
  } catch (error) {
    logger.error('Auth', 'Registration error', error);
    res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

/**
 * Log in with email and password.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid email or password format' });
      return;
    }

    const { email, password } = parseResult.data;
    const db = getDb();

    const userRow = db.prepare(`
      SELECT id, email, password_hash, name FROM users WHERE email = ?
    `).get(email.toLowerCase()) as {
      id: string;
      email: string;
      password_hash: string;
      name: string;
    } | undefined;

    if (!userRow) {
      // Fake delay or same response to prevent user enumeration
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      logger.warn('Auth', 'Failed login attempt', { email: userRow.email });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const userAgent = req.headers['user-agent'];
    const { token, expiresAt } = createSession(userRow.id, userAgent);
    setSessionCookie(res, token, expiresAt);

    logger.info('Auth', 'User logged in successfully', { userId: userRow.id });

    res.json({
      message: 'Login successful',
      user: { id: userRow.id, email: userRow.email, name: userRow.name },
    });
  } catch (error) {
    logger.error('Auth', 'Login error', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

/**
 * Log out current session.
 */
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.session_token;
  if (token) {
    revokeSession(token);
  }
  res.clearCookie('session_token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

/**
 * Get currently authenticated user details.
 */
router.get('/me', authenticateUser, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/**
 * Change user password.
 */
router.post('/change-password', authenticateUser, async (req: Request, res: Response) => {
  try {
    const parseResult = ChangePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;
    const userId = req.user!.id;
    const db = getDb();

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string;
    };

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.isValid) {
      res.status(400).json({ error: strengthCheck.message });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      now,
      userId
    );

    // Revoke all existing sessions and issue a fresh session
    revokeAllUserSessions(userId);
    const userAgent = req.headers['user-agent'];
    const { token, expiresAt } = createSession(userId, userAgent);
    setSessionCookie(res, token, expiresAt);

    logger.info('Auth', 'Password updated successfully', { userId });
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Auth', 'Change password error', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

/**
 * Delete account and all associated local data.
 */
router.delete('/account', authenticateUser, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = getDb();

    // Cascading delete deletes all sessions, lectures, notes, cards, quizzes for this user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.clearCookie('session_token', { path: '/' });

    logger.info('Auth', 'User account deleted', { userId });
    res.json({ message: 'Account and associated data deleted successfully.' });
  } catch (error) {
    logger.error('Auth', 'Delete account error', error);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

export default router;
