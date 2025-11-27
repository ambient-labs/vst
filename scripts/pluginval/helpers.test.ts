import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import {
  loadConfig,
  getPluginvalPath,
  getPluginPath,
  runPluginval,
  type PlatformConfig,
} from './helpers.js';

const TEST_DIR = join(process.cwd(), 'node_modules/.cache/pluginval-test');

describe('loadConfig', () => {
  const testConfigPath = join(TEST_DIR, 'test-config.json');

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should load and parse a valid config file', async () => {
    const testConfig = {
      version: 'v1.0.0',
      cacheDir: 'node_modules/.cache/test',
      pluginName: 'TestPlugin',
      platforms: {
        darwin: {
          downloadUrl: 'https://example.com/darwin.zip',
          executable: 'pluginval',
          isAppBundle: true,
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig));

    const config = await loadConfig(testConfigPath);

    expect(config.version).toBe('v1.0.0');
    expect(config.cacheDir).toBe('node_modules/.cache/test');
    expect(config.pluginName).toBe('TestPlugin');
    expect(config.platforms.darwin.executable).toBe('pluginval');
  });

  it('should throw on invalid JSON', async () => {
    writeFileSync(testConfigPath, 'not valid json');

    await expect(loadConfig(testConfigPath)).rejects.toThrow();
  });

  it('should throw on missing file', async () => {
    await expect(loadConfig('/nonexistent/config.json')).rejects.toThrow();
  });
});

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

describe('getPluginPath', () => {
  it('should construct correct path with default build type', () => {
    const result = getPluginPath('/root', 'MyPlugin');

    expect(result).toBe(
      '/root/native/build/scripted/MyPlugin_artefacts/Release/VST3/MyPlugin.vst3'
    );
  });

  it('should construct correct path with custom build type', () => {
    const result = getPluginPath('/root', 'MyPlugin', 'Debug');

    expect(result).toBe(
      '/root/native/build/scripted/MyPlugin_artefacts/Debug/VST3/MyPlugin.vst3'
    );
  });
});

describe('runPluginval', () => {
  it('should return success result for successful command', () => {
    const result = runPluginval('/bin/echo', '', ['hello']);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello');
  });

  it('should return failure result for failed command', () => {
    const result = runPluginval('/bin/false', '', []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should return failure for non-existent command', () => {
    // Non-existent commands cause ENOENT which is caught and returned
    const result = runPluginval('/nonexistent/command', '', []);

    expect(result.success).toBe(false);
  });
});
