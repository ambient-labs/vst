import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Config, PlatformConfig } from './load-config.js';
import type { SetupOptions } from './setup.js';

// Use vi.hoisted to create mocks that can be accessed in vi.mock factories
const mocks = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  extractZip: vi.fn(),
  getPluginvalPath: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  chmod: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('helpers/download-file', () => ({
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
    mkdir: mocks.mkdir,
    unlink: mocks.unlink,
    chmod: mocks.chmod,
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mocks.existsSync,
  };
});

// Must import after mocks are set up
import { setup } from './setup.js';

describe('setup', () => {
  let mockLogger: { log: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let baseConfig: Config;
  let basePlatformConfig: PlatformConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.unlink.mockResolvedValue(undefined);
    mocks.chmod.mockResolvedValue(undefined);
    mocks.existsSync.mockReturnValue(false);

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

  it('should return existing installation if already installed', async () => {
    mocks.getPluginvalPath.mockResolvedValueOnce('/cache/pluginval');

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
    expect(mocks.downloadFile).not.toHaveBeenCalled();
    expect(mocks.extractZip).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('already installed'));
  });

  it('should download and extract when not installed', async () => {
    // First call (check existing) throws, second call (after extract) returns path
    mocks.getPluginvalPath
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce('/cache/pluginval');

    mocks.downloadFile.mockResolvedValueOnce(undefined);
    mocks.extractZip.mockResolvedValueOnce(undefined);

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
    expect(mocks.downloadFile).toHaveBeenCalledWith(
      basePlatformConfig.downloadUrl,
      '/cache/pluginval.zip'
    );
    expect(mocks.extractZip).toHaveBeenCalledWith('/cache/pluginval.zip', { dir: '/cache' });
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
      cacheDir: '/cache',
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
      cacheDir: '/cache',
      logger: mockLogger,
    };

    await expect(setup(options)).rejects.toThrow('Invalid zip');
  });

  it('should use default console logger if none provided', async () => {
    mocks.getPluginvalPath.mockResolvedValueOnce('/cache/pluginval');

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

  it('should chmod binary on darwin/linux', async () => {
    mocks.getPluginvalPath
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce('/cache/pluginval');
    mocks.downloadFile.mockResolvedValueOnce(undefined);
    mocks.extractZip.mockResolvedValueOnce(undefined);

    const options: SetupOptions = {
      config: baseConfig,
      platformConfig: basePlatformConfig,
      platform: 'darwin',
      cacheDir: '/cache',
      logger: mockLogger,
    };

    await setup(options);

    expect(mocks.chmod).toHaveBeenCalledWith('/cache/pluginval', 0o755);
  });
});
