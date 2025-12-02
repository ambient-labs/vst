import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mkdir, unlink, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { downloadFile } from 'helpers/download-file';
import extractZip from 'extract-zip';
import { getPluginvalPath } from './get-pluginval-path.js';
import type { Config, PlatformConfig } from './load-config.js';
import type { SetupOptions } from './setup.js';

vi.mock('helpers/download-file', (): { downloadFile: typeof downloadFile } => ({
  downloadFile: vi.fn(),
}));

vi.mock('extract-zip', (): { default: typeof extractZip } => ({
  default: vi.fn(),
}));

vi.mock('./get-pluginval-path.js', (): { getPluginvalPath: typeof getPluginvalPath } => ({
  getPluginvalPath: vi.fn(),
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    mkdir: vi.fn(),
    unlink: vi.fn(),
    chmod: vi.fn(),
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Must import after mocks are set up
import { setup } from './setup.js';

describe('setup', () => {
  let mockLogger: { log: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let baseConfig: Config;
  let basePlatformConfig: PlatformConfig;

  beforeEach(() => {
    // Default mock implementations
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
    vi.mocked(chmod).mockResolvedValue(undefined);
    vi.mocked(existsSync).mockReturnValue(false);

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

  test('should return existing installation if already installed', async () => {
    vi.mocked(getPluginvalPath).mockResolvedValueOnce('/cache/pluginval');

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    const result = await setup(options);

    expect(result.binaryPath).toBe('/cache/pluginval');
    expect(result.wasAlreadyInstalled).toBe(true);
    expect(downloadFile).not.toHaveBeenCalled();
    expect(extractZip).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('already installed'));
  });

  test('should download and extract when not installed', async () => {
    // First call (check existing) throws, second call (after extract) returns path
    vi.mocked(getPluginvalPath)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce('/cache/pluginval');

    vi.mocked(downloadFile).mockResolvedValueOnce(undefined);
    vi.mocked(extractZip).mockResolvedValueOnce(undefined);

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    const result = await setup(options);

    expect(result.binaryPath).toBe('/cache/pluginval');
    expect(result.wasAlreadyInstalled).toBe(false);
    expect(downloadFile).toHaveBeenCalledWith(
      basePlatformConfig.downloadUrl,
      '/cache/pluginval.zip'
    );
    expect(extractZip).toHaveBeenCalledWith('/cache/pluginval.zip', { dir: '/cache' });
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Download complete'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Extraction complete'));
  });

  test('should throw on download failure', async () => {
    vi.mocked(getPluginvalPath).mockRejectedValueOnce(new Error('Not found'));
    vi.mocked(downloadFile).mockRejectedValueOnce(new Error('Network error'));

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    await expect(setup(options)).rejects.toThrow('Network error');
  });

  test('should throw on extraction failure', async () => {
    vi.mocked(getPluginvalPath).mockRejectedValueOnce(new Error('Not found'));
    vi.mocked(downloadFile).mockResolvedValueOnce(undefined);
    vi.mocked(extractZip).mockRejectedValueOnce(new Error('Invalid zip'));

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    await expect(setup(options)).rejects.toThrow('Invalid zip');
  });

  test('should use default console logger if none provided', async () => {
    vi.mocked(getPluginvalPath).mockResolvedValueOnce('/cache/pluginval');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'linux',
      cacheDir: '/cache',
    };

    await setup(options);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should chmod binary on darwin/linux', async () => {
    vi.mocked(getPluginvalPath)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce('/cache/pluginval');
    vi.mocked(downloadFile).mockResolvedValueOnce(undefined);
    vi.mocked(extractZip).mockResolvedValueOnce(undefined);

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'darwin',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    await setup(options);

    expect(chmod).toHaveBeenCalledWith('/cache/pluginval', 0o755);
  });
});
