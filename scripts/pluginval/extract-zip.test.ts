import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { extractZip } from './extract-zip.js';

describe('extractZip', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'extract-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should extract a zip file', async () => {
    // Create a test file and zip it
    const testFile = join(testDir, 'test-content.txt');
    await writeFile(testFile, 'Hello, World!');

    const zipPath = join(testDir, 'test.zip');
    execFileSync('zip', ['-j', zipPath, testFile], { stdio: 'pipe' });

    // Remove original file
    await rm(testFile);

    // Extract to a subdirectory
    const extractDir = join(testDir, 'extracted');

    await extractZip(zipPath, extractDir);

    // Verify extraction
    const extractedContent = await readFile(join(extractDir, 'test-content.txt'), 'utf-8');
    expect(extractedContent).toBe('Hello, World!');
  });

  it('should throw on missing zip file', async () => {
    const extractDir = join(testDir, 'extracted');

    await expect(extractZip('/nonexistent/file.zip', extractDir)).rejects.toThrow();
  });
});
