import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../security/logger';

const execFileAsync = promisify(execFile);

export interface ScanResult {
  isSafe: boolean;
  violations: string[];
}

const FORBIDDEN_FILE_EXTENSIONS = new Set(['.db', '.sqlite', '.sqlite3', '.webm', '.wav', '.mp3', '.m4a', '.key', '.pem']);
const FORBIDDEN_FILE_NAMES = new Set(['.env', '.session_secret', 'id_rsa', 'id_ed25519']);

const FORBIDDEN_CONTENT_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\$argon2id\$v=\d+\$m=\d+/,
  /ghp_[0-9a-zA-Z]{36}/,
  /github_pat_[0-9a-zA-Z_]{82}/,
  /sk-[0-9a-zA-Z]{32,}/,
];

function isPathGitIgnored(rootDir: string, relPath: string): boolean {
  try {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return false;
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = gitignore.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    return lines.some((line) => {
      const clean = line.replace(/^\//, '').replace(/\/$/, '');
      return relPath === clean || relPath.startsWith(clean + '/');
    });
  } catch {
    return false;
  }
}

/**
 * Scans a directory tree for any leaked secrets, private keys, databases, or audio recordings.
 */
export async function scanForSecretsAndPrivateData(rootDir: string): Promise<ScanResult> {
  const violations: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      // Skip ignored directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }

      // If data directory is explicitly gitignored in rootDir, skip scanning local runtime files
      if (entry.name === 'data' && isPathGitIgnored(rootDir, 'data')) {
        continue;
      }

      if (entry.isDirectory()) {
        if (relPath.startsWith('data/recordings') || relPath.startsWith('data/transcripts')) {
          violations.push(`Forbidden private directory found in sync scan: ${relPath}`);
        } else {
          await walk(fullPath);
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();

        // Check forbidden file names and extensions
        if (FORBIDDEN_FILE_NAMES.has(entry.name.toLowerCase())) {
          violations.push(`Sensitive file must not be committed: ${relPath}`);
        } else if (FORBIDDEN_FILE_EXTENSIONS.has(ext)) {
          violations.push(`Forbidden file extension (${ext}): ${relPath}`);
        } else if (entry.name.startsWith('.env') && entry.name !== '.env.example') {
          violations.push(`Environment file must not be committed: ${relPath}`);
        } else {
          // Scan file contents for private keys, hashes, or tokens
          try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.size < 1024 * 1024) { // Only scan text files under 1MB
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
                if (pattern.test(content)) {
                  violations.push(`Sensitive secret pattern detected in ${relPath}`);
                  break;
                }
              }
            }
          } catch {
            // Non-text file or unreadable
          }
        }
      }
    }
  }

  await walk(rootDir);

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

/**
 * Retrieves the stored GitHub credential token from Git Credential Manager.
 */
async function getGitHubCredential(): Promise<{ username: string; token: string }> {
  const gitCmd = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\git.exe' : 'git';

  return new Promise((resolve, reject) => {
    const proc = execFile(
      gitCmd,
      ['credential', 'fill'],
      (err, stdout) => {
        if (err) return reject(err);
        const lines = stdout.split('\n');
        let username = '';
        let token = '';

        for (const line of lines) {
          if (line.startsWith('username=')) username = line.replace('username=', '').trim();
          if (line.startsWith('password=')) token = line.replace('password=', '').trim();
        }

        if (token) {
          resolve({ username, token });
        } else {
          reject(new Error('No GitHub credentials found in credential manager'));
        }
      }
    );

    proc.stdin?.write('protocol=https\nhost=github.com\n\n');
    proc.stdin?.end();
  });
}

/**
 * Creates a new private repository under the user's GitHub account and pushes source code.
 */
export async function syncToPrivateRepository(
  repoName = 'local-lecture-study-suite',
  rootDir = process.cwd()
): Promise<{ success: boolean; repositoryUrl: string; message: string }> {
  logger.info('GitSync', 'Starting pre-upload secret and privacy scan...');

  // 1. Pre-upload scan
  const scan = await scanForSecretsAndPrivateData(rootDir);
  if (!scan.isSafe) {
    const errorMsg = `Pre-upload scan aborted with ${scan.violations.length} violations: ${scan.violations.join(', ')}`;
    logger.error('GitSync', errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('GitSync', 'Pre-upload scan passed cleanly with zero secrets or private data detected');

  // 2. Fetch GitHub credentials
  const { username, token } = await getGitHubCredential();
  const gitCmd = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\git.exe' : 'git';

  // 3. Create private repo via GitHub API if not exists
  let repoUrl = `https://github.com/${username}/${repoName}`;
  try {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'LocalLectureSync',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        private: true,
        description: 'Production-quality local AI lecture recording, Whisper transcription, and study suite',
      }),
    });

    if (res.status === 201) {
      const data = await res.json() as { html_url: string };
      repoUrl = data.html_url;
      logger.info('GitSync', `Created new private GitHub repository: ${repoUrl}`);
    } else if (res.status === 422) {
      logger.info('GitSync', `Repository ${repoName} already exists under ${username}. Proceeding to push updates.`);
    } else {
      const errText = await res.text();
      logger.warn('GitSync', `GitHub API returned status ${res.status}: ${errText}`);
    }
  } catch (error) {
    logger.error('GitSync', 'Failed to call GitHub API for repo creation', error);
  }

  // 4. Git init, stage safe files, commit and push
  await execFileAsync(gitCmd, ['init'], { cwd: rootDir });
  await execFileAsync(gitCmd, ['add', '.'], { cwd: rootDir });

  // Verify staged files
  const { stdout: statusOut } = await execFileAsync(gitCmd, ['status', '--porcelain'], { cwd: rootDir });
  const stagedLines = statusOut.split('\n').filter(Boolean);

  for (const line of stagedLines) {
    if (line.includes('.db') || line.includes('.env') && !line.includes('.env.example') || line.includes('recordings')) {
      throw new Error(`CRITICAL: Prohibited file was staged for commit: ${line}`);
    }
  }

  try {
    await execFileAsync(gitCmd, ['commit', '-m', 'Initial commit: Local-first AI lecture recording and study suite'], { cwd: rootDir });
  } catch (e: any) {
    // If nothing to commit, continue
    if (!e.message?.includes('nothing to commit')) {
      logger.warn('GitSync', 'Commit note', { message: e.message });
    }
  }

  // Set remote and push
  const authenticatedRemote = `https://${username}:${token}@github.com/${username}/${repoName}.git`;

  try {
    await execFileAsync(gitCmd, ['remote', 'remove', 'origin'], { cwd: rootDir });
  } catch {}

  await execFileAsync(gitCmd, ['remote', 'add', 'origin', authenticatedRemote], { cwd: rootDir });

  // Get current branch name
  const { stdout: branchOut } = await execFileAsync(gitCmd, ['branch', '--show-current'], { cwd: rootDir });
  const branch = branchOut.trim() || 'master';

  logger.info('GitSync', `Pushing safe source code to ${repoName}:${branch}...`);
  await execFileAsync(gitCmd, ['push', '-u', 'origin', branch, '--force'], { cwd: rootDir });

  // Reset remote URL to clean HTTPS url without embedded token for safety at rest!
  await execFileAsync(gitCmd, ['remote', 'set-url', 'origin', `https://github.com/${username}/${repoName}.git`], { cwd: rootDir });

  logger.info('GitSync', `Successfully pushed application source code to ${repoUrl}`);

  return {
    success: true,
    repositoryUrl: repoUrl,
    message: `Source code successfully uploaded to private repository ${repoUrl}`,
  };
}
