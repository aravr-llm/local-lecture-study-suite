import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../database/db';
import { authenticateUser } from '../auth/session';
import { AIProviderFactory } from '../ai/provider';
import { TranscriptionProviderFactory } from '../transcription/whisperProvider';
import { config, RECORDINGS_DIR, DATA_DIR } from '../config';
import { logger } from '../security/logger';

const router = Router();
router.use(authenticateUser);

/**
 * Get comprehensive system diagnostics and local AI status.
 */
router.get('/diagnostics', async (req: Request, res: Response) => {
  try {
    const aiStatus = await AIProviderFactory.getSystemStatus();
    const transcriptionProvider = await TranscriptionProviderFactory.getProvider();
    const transcriptionAvailable = await transcriptionProvider.isAvailable();

    // Check storage size
    let audioTotalBytes = 0;
    try {
      const files = await fs.promises.readdir(RECORDINGS_DIR);
      for (const file of files) {
        const stat = await fs.promises.stat(path.join(RECORDINGS_DIR, file));
        audioTotalBytes += stat.size;
      }
    } catch {}

    let dbSizeBytes = 0;
    try {
      const dbStat = await fs.promises.stat(path.resolve(process.cwd(), config.databasePath));
      dbSizeBytes = dbStat.size;
    } catch {}

    res.json({
      privacyBanners: {
        aiProcessing: 'LOCAL',
        externalAiServices: 'NONE',
        transcription: 'LOCAL',
        audioUpload: 'DISABLED',
      },
      aiStatus,
      transcriptionStatus: {
        activeProvider: transcriptionProvider.name,
        isAvailable: transcriptionAvailable,
      },
      storage: {
        recordingsDir: RECORDINGS_DIR,
        audioTotalBytes,
        audioTotalFormatted: `${(audioTotalBytes / (1024 * 1024)).toFixed(2)} MB`,
        databaseSizeBytes: dbSizeBytes,
        databaseSizeFormatted: `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      },
      config: {
        port: config.port,
        localAiProvider: config.localAiProvider,
        localAiUrl: config.localAiUrl,
        localAiModel: config.localAiModel,
        whisperModel: config.whisperModel,
        enableTelemetry: false,
        allowExternalAi: false,
      },
    });
  } catch (error) {
    logger.error('SettingsRoutes', 'Diagnostics error', error);
    res.status(500).json({ error: 'Failed to retrieve diagnostics' });
  }
});

/**
 * Get app settings.
 */
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value_json FROM app_settings').all() as Array<{ key: string; value_json: string }>;
  const settings: Record<string, any> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }
  res.json({ settings });
});

/**
 * Save app setting.
 */
router.post('/', (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'Invalid setting key' });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), now);

  res.json({ message: 'Setting saved successfully' });
});

export default router;
