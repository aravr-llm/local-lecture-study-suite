import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { SCHEMA_SQL } from './schema';
import { logger } from '../security/logger';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const resolvedPath = path.resolve(process.cwd(), config.databasePath);
    const dbDir = path.dirname(resolvedPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(resolvedPath);

    // Enforce foreign key constraints and fast write-ahead logging
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');

    logger.info('Database', 'Connected to SQLite database', { path: resolvedPath });
  }

  return dbInstance;
}

/**
 * Initializes the database tables and runs schema migrations.
 */
export function initDatabase(): void {
  const db = getDb();

  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Check if baseline schema is applied
  const baseline = db.prepare('SELECT id FROM _migrations WHERE name = ?').get('001_initial_schema');

  if (!baseline) {
    logger.info('Database', 'Applying initial database schema migration');
    db.exec(SCHEMA_SQL);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
      '001_initial_schema',
      new Date().toISOString()
    );
    logger.info('Database', 'Database schema migration completed successfully');
  }
}

/**
 * Closes the database connection cleanly (e.g. on server shutdown).
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database', 'Database connection closed');
  }
}
