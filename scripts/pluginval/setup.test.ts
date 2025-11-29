import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { Config, PlatformConfig } from './load-config.js';
import type { SetupOptions } from './setup.js';

// Use vi.hoisted to create mocks that can be accessed in vi.mock factories
const mocks = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  extractZip: vi.fn(),
  getPluginvalPath: vi.fn(),
  unlink: vi.fn(),
  chmod: vi.fn(),
}));

vi.mock('./download-file.js', () => ({
  downloadFile: mocks.downloadFile,
}));

vi.mock('extract-zip', () => ({
  default: mocks.extractZip,
}));

vi.mock('./get-pluginval-path.js', () => ({
  getPluginvalPath: mocks.getPluginvalPath,
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    unlink: mocks.unlink,
    chmod: mocks.chmod,
  };
});

// Must import after mocks are set up
import { setup } from './setup.js';

describe('setup', () => {
  let testDir: string;
  let mockLogger: { log: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let baseConfig: Config;
  let basePlatformConfig: PlatformConfig;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'setup-test-'));

    // Reset all mocks before each test
    mocks.downloadFile.mockReset();
    mocks.extractZip.mockReset();
    mocks.getPluginvalPath.mockReset();
    mocks.unlink.mockReset().mockResolvedValue(undefined);
    mocks.chmod.mockReset().mockResolvedValue(undefined);

    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    };

    baseConfig = {
      version: '1.0.0',
      cacheDir: 'node_modules/.cache/pluginval',
      pluginName: 'TestPlugin',
      platforms: {
        linux: {
          downloadUrl: 'https://example.com/pluginval-linux.zip',
          executable: 'pluginval',
          isAppBundle: false,
        },
      },
    };

    basePlatformConfig = baseConfig.platforms.linux;
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return existing installation if already installed', async () => {
    const existingPath = join(testDir, 'pluginval');
    mocks.getPluginvalPath.mockResolvedValueOnce(existingPath);

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: testDir,
      logger: mockLogger,
    };

    const result = await setup(options);

    expect(result.binaryPath).toBe(existingPath);
    expect(result.wasAlreadyInstalled).toBe(true);
    expect(mocks.downloadFile).not.toHaveBeenCalled();
    expect(mocks.extractZip).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('already installed'));
  });

  it('should download and extract when not installed', async () => {
    const binaryPath = join(testDir, 'pluginval');

    // First call (check existing) throws, second call (after extract) returns path
    mocks.getPluginvalPath
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce(binaryPath);

    mocks.downloadFile.mockResolvedValueOnce(undefined);
    mocks.extractZip.mockResolvedValueOnce(undefined);

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: testDir,
      logger: mockLogger,
    };

    const result = await setup(options);

    expect(result.binaryPath).toBe(binaryPath);
    expect(result.wasAlreadyInstalled).toBe(false);
    expect(mocks.downloadFile).toHaveBeenCalledWith(
      basePlatformConfig.downloadUrl,
      expect.stringContaining('pluginval.zip')
    );
    expect(mocks.extractZip).toHaveBeenCalledWith(
      expect.stringContaining('pluginval.zip'),
      { dir: testDir }
    );
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Download complete'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Extraction complete'));
  });

  it('should throw on download failure', async () => {
    mocks.getPluginvalPath.mockRejectedValueOnce(new Error('Not found'));
    mocks.downloadFile.mockRejectedValueOnce(new Error('Network error'));

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: testDir,
      logger: mockLogger,
    };

    await expect(setup(options)).rejects.toThrow('Network error');
  });

  it('should throw on extraction failure', async () => {
    mocks.getPluginvalPath.mockRejectedValueOnce(new Error('Not found'));
    mocks.downloadFile.mockResolvedValueOnce(undefined);
    mocks.extractZip.mockRejectedValueOnce(new Error('Invalid zip'));

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: testDir,
      logger: mockLogger,
    };

    await expect(setup(options)).rejects.toThrow('Invalid zip');
  });

  it('should use default console logger if none provided', async () => {
    const existingPath = join(testDir, 'pluginval');
    mocks.getPluginvalPath.mockResolvedValueOnce(existingPath);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: testDir,
    };

    await setup(options);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
