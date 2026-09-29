import { Router, Request, Response } from 'express';
import { authenticateUser } from '../auth/session';
import { syncToPrivateRepository, scanForSecretsAndPrivateData } from '../services/gitSyncService';
import { logger } from '../security/logger';

const router = Router();
router.use(authenticateUser);

/**
 * Pre-flight scan check: returns list of any security/privacy violations before attempting sync.
 */
router.get('/scan', async (req: Request, res: Response) => {
  try {
    const scan = await scanForSecretsAndPrivateData(process.cwd());
    res.json({ scan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

/**
 * Syncs application source code safely to a new private GitHub repository under user's account.
 */
router.post('/upload', async (req: Request, res: Response) => {
  const repoName = (req.body.repoName as string) || 'local-lecture-study-suite';

  try {
    logger.info('SyncRoutes', `Initiating safe source-code upload for repository: ${repoName}`);
    const result = await syncToPrivateRepository(repoName, process.cwd());
    res.json(result);
  } catch (error: any) {
    logger.error('SyncRoutes', 'Repository sync failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload repository',
    });
  }
});

export default router;
