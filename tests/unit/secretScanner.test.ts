import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanForSecretsAndPrivateData } from '../../backend/services/gitSyncService';

describe('Pre-Upload Secret & Privacy Scanner', () => {
  const tempTestDir = path.resolve(process.cwd(), 'tests', 'temp_scan_dir');

  beforeEach(async () => {
    if (fs.existsSync(tempTestDir)) {
      await fs.promises.rm(tempTestDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(tempTestDir, { recursive: true });
  });

  afterEach(async () => {
    if (fs.existsSync(tempTestDir)) {
      await fs.promises.rm(tempTestDir, { recursive: true, force: true });
    }
  });

  it('approves a clean source repository', async () => {
    await fs.promises.writeFile(path.join(tempTestDir, 'index.ts'), 'export const hello = "world";');
    await fs.promises.writeFile(path.join(tempTestDir, 'README.md'), '# Project');
    await fs.promises.writeFile(path.join(tempTestDir, '.env.example'), 'PORT=3001');

    const result = await scanForSecretsAndPrivateData(tempTestDir);
    expect(result.isSafe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects and flags database files', async () => {
    await fs.promises.writeFile(path.join(tempTestDir, 'test.db'), 'fake-binary-sqlite');
    const result = await scanForSecretsAndPrivateData(tempTestDir);
    expect(result.isSafe).toBe(false);
    expect(result.violations.some((v) => v.includes('.db'))).toBe(true);
  });

  it('detects and flags private audio recordings', async () => {
    await fs.promises.writeFile(path.join(tempTestDir, 'lecture.webm'), 'audio-data');
    const result = await scanForSecretsAndPrivateData(tempTestDir);
    expect(result.isSafe).toBe(false);
    expect(result.violations.some((v) => v.includes('.webm'))).toBe(true);
  });

  it('detects uncommitted real .env files', async () => {
    await fs.promises.writeFile(path.join(tempTestDir, '.env'), 'SECRET_KEY=12345');
    const result = await scanForSecretsAndPrivateData(tempTestDir);
    expect(result.isSafe).toBe(false);
    expect(result.violations.some((v) => v.includes('.env'))).toBe(true);
  });

  it('detects sensitive API keys or private keys in code', async () => {
    await fs.promises.writeFile(
      path.join(tempTestDir, 'leaked.ts'),
      'const key = "-----BEGIN ' + 'PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC..."'
    );
    const result = await scanForSecretsAndPrivateData(tempTestDir);
    expect(result.isSafe).toBe(false);
    expect(result.violations.some((v) => v.includes('Sensitive secret pattern'))).toBe(true);
  });
});
