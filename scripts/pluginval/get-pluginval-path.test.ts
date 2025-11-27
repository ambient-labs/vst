import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { getPluginvalPath } from './get-pluginval-path.js';
import type { PlatformConfig } from './load-config.js';

const TEST_DIR = join(process.cwd(), 'node_modules/.cache/get-pluginval-path-test');

describe('getPluginvalPath', () => {
  const platformConfig: PlatformConfig = {
    downloadUrl: 'https://example.com/pluginval.zip',
    executable: 'pluginval',
    isAppBundle: false,
  };

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should find binary at expected path', () => {
    const binaryPath = join(TEST_DIR, 'pluginval');
    writeFileSync(binaryPath, 'fake binary');

    const result = getPluginvalPath(TEST_DIR, platformConfig, 'linux');

    expect(result).toBe(binaryPath);
  });

  it('should find binary in subdirectory', () => {
    const subDir = join(TEST_DIR, 'subdir');
    mkdirSync(subDir);
    const binaryPath = join(subDir, 'pluginval');
    writeFileSync(binaryPath, 'fake binary');

    const result = getPluginvalPath(TEST_DIR, platformConfig, 'linux');

    expect(result).toBe(binaryPath);
  });

  it('should find binary in macOS app bundle', () => {
    const appDir = join(TEST_DIR, 'pluginval.app');
    const macosDir = join(appDir, 'Contents', 'MacOS');
    mkdirSync(macosDir, { recursive: true });
    const binaryPath = join(macosDir, 'pluginval');
    writeFileSync(binaryPath, 'fake binary');

    const result = getPluginvalPath(TEST_DIR, platformConfig, 'darwin');

    expect(result).toBe(binaryPath);
  });

  it('should throw when binary not found', () => {
    expect(() => getPluginvalPath(TEST_DIR, platformConfig, 'linux')).toThrow(
      "Pluginval binary not found. Run 'pnpm run setup-pluginval' first."
    );
  });
});
