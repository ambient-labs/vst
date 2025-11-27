import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { downloadFile } from './download-file.js';

const TEST_DIR = join(process.cwd(), 'node_modules/.cache/download-test');

describe('downloadFile', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should download a file successfully', async () => {
    const dest = join(TEST_DIR, 'test-download.txt');

    // Use a reliable, small test file
    await downloadFile(
      'https://raw.githubusercontent.com/ambient-labs/vst/main/README.md',
      dest
    );

    expect(existsSync(dest)).toBe(true);
    const content = readFileSync(dest, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle HTTP errors gracefully', async () => {
    const dest = join(TEST_DIR, 'test-error.txt');

    // Test that HTTP errors are properly rejected
    // Note: The specific error message may vary based on network conditions
    await expect(
      downloadFile('https://raw.githubusercontent.com/nonexistent-org-12345/nonexistent-repo/main/file.txt', dest)
    ).rejects.toThrow();
  }, 30000);

  it('should reject on 404 errors', async () => {
    const dest = join(TEST_DIR, 'test-404.txt');

    await expect(
      downloadFile('https://raw.githubusercontent.com/nonexistent/repo/main/file.txt', dest)
    ).rejects.toThrow('Failed to download: 404');
  }, 30000);

  it('should reject on invalid URL', async () => {
    const dest = join(TEST_DIR, 'test-invalid.txt');

    await expect(
      downloadFile('https://invalid.invalid.invalid/file.txt', dest)
    ).rejects.toThrow();
  }, 30000);
});
