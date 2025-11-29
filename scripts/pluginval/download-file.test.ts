import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { downloadFile } from './download-file.js';

describe('downloadFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'download-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should download a file successfully', async () => {
    const dest = join(testDir, 'test-download.txt');

    await downloadFile('https://raw.githubusercontent.com/ambient-labs/vst/main/README.md', dest);

    const content = await readFile(dest, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should handle HTTP errors gracefully', async () => {
    const dest = join(testDir, 'test-error.txt');

    await expect(
      downloadFile(
        'https://raw.githubusercontent.com/nonexistent-org-12345/nonexistent-repo/main/file.txt',
        dest
      )
    ).rejects.toThrow();
  });

  it('should reject on 404 errors', async () => {
    const dest = join(testDir, 'test-404.txt');

    await expect(
      downloadFile(
        'https://raw.githubusercontent.com/ambient-labs/vst/main/nonexistent-file.txt',
        dest
      )
    ).rejects.toThrow('404');
  });
});
