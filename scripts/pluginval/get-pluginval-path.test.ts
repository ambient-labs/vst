import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { getPluginvalPath } from './get-pluginval-path.js';
import type { PlatformConfig } from './load-config.js';

describe('getPluginvalPath', () => {
  let testDir: string;

  const platformConfig: PlatformConfig = {
    downloadUrl: 'https://example.com/pluginval.zip',
    executable: 'pluginval',
    isAppBundle: false,
  };

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pluginval-path-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should find binary at expected path', async () => {
    const binaryPath = join(testDir, 'pluginval');
    await writeFile(binaryPath, 'fake binary');

    const result = await getPluginvalPath(testDir, platformConfig, 'linux');

    expect(result).toBe(binaryPath);
  });

  it('should find binary in subdirectory', async () => {
    const subDir = join(testDir, 'subdir');
    await mkdir(subDir);
    const binaryPath = join(subDir, 'pluginval');
    await writeFile(binaryPath, 'fake binary');

    const result = await getPluginvalPath(testDir, platformConfig, 'linux');

    expect(result).toBe(binaryPath);
  });

  it('should find binary in macOS app bundle', async () => {
    const appDir = join(testDir, 'pluginval.app');
    const macosDir = join(appDir, 'Contents', 'MacOS');
    await mkdir(macosDir, { recursive: true });
    const binaryPath = join(macosDir, 'pluginval');
    await writeFile(binaryPath, 'fake binary');

    const result = await getPluginvalPath(testDir, platformConfig, 'darwin');

    expect(result).toBe(binaryPath);
  });

  it('should throw when binary not found', async () => {
    await expect(getPluginvalPath(testDir, platformConfig, 'linux')).rejects.toThrow(
      "Pluginval binary not found. Run 'pnpm run setup-pluginval' first."
    );
  });
});
