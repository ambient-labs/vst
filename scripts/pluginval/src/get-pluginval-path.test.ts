import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as _FsPromisesModule from 'fs/promises';
import type { PlatformConfig } from './load-config.js';

const mocks = vi.hoisted(() => ({
  stat: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _FsPromisesModule;
  return {
    ...actual,
    stat: mocks.stat,
    readdir: mocks.readdir,
  };
});

import { getPluginvalPath } from './get-pluginval-path.js';

describe('getPluginvalPath', () => {
  const platformConfig: PlatformConfig = {
    downloadUrl: 'https://example.com/pluginval.zip',
    executable: 'pluginval',
    isAppBundle: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find binary at expected path', async () => {
    mocks.stat.mockResolvedValueOnce({ isFile: () => true });

    const result = await getPluginvalPath('/cache', platformConfig, 'linux');

    expect(result).toBe('/cache/pluginval');
    expect(mocks.stat).toHaveBeenCalledWith('/cache/pluginval');
  });

  it('should find binary in subdirectory', async () => {
    // First stat call (expected path) fails
    mocks.stat.mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns a subdirectory
    mocks.readdir.mockResolvedValueOnce([
      { name: 'subdir', isDirectory: () => true },
    ]);
    // stat for subdirectory binary succeeds
    mocks.stat.mockResolvedValueOnce({ isFile: () => true });

    const result = await getPluginvalPath('/cache', platformConfig, 'linux');

    expect(result).toBe('/cache/subdir/pluginval');
  });

  it('should find binary in macOS app bundle', async () => {
    // First stat call (expected path) fails
    mocks.stat.mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns an app bundle
    mocks.readdir.mockResolvedValueOnce([
      { name: 'pluginval.app', isDirectory: () => true },
    ]);
    // stat for app bundle binary succeeds
    mocks.stat.mockResolvedValueOnce({ isFile: () => true });

    const result = await getPluginvalPath('/cache', platformConfig, 'darwin');

    expect(result).toBe('/cache/pluginval.app/Contents/MacOS/pluginval');
  });

  it('should throw when binary not found', async () => {
    // First stat call (expected path) fails
    mocks.stat.mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns empty
    mocks.readdir.mockResolvedValueOnce([]);

    await expect(getPluginvalPath('/cache', platformConfig, 'linux')).rejects.toThrow(
      "Pluginval binary not found. Run 'pnpm run setup-pluginval' first."
    );
  });
});
