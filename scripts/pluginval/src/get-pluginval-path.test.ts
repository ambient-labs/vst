import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stat, readdir } from 'fs/promises';
import type { PlatformConfig } from './load-config.js';

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    stat: vi.fn(),
    readdir: vi.fn(),
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
    vi.mocked(stat).mockResolvedValueOnce({ isFile: () => true } as never);

    const result = await getPluginvalPath('/cache', platformConfig, 'linux');

    expect(result).toBe('/cache/pluginval');
    expect(stat).toHaveBeenCalledWith('/cache/pluginval');
  });

  it('should find binary in subdirectory', async () => {
    // First stat call (expected path) fails
    vi.mocked(stat).mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns a subdirectory
    vi.mocked(readdir).mockResolvedValueOnce([
      { name: 'subdir', isDirectory: () => true },
    ] as never);
    // stat for subdirectory binary succeeds
    vi.mocked(stat).mockResolvedValueOnce({ isFile: () => true } as never);

    const result = await getPluginvalPath('/cache', platformConfig, 'linux');

    expect(result).toBe('/cache/subdir/pluginval');
  });

  it('should find binary in macOS app bundle', async () => {
    // First stat call (expected path) fails
    vi.mocked(stat).mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns an app bundle
    vi.mocked(readdir).mockResolvedValueOnce([
      { name: 'pluginval.app', isDirectory: () => true },
    ] as never);
    // stat for app bundle binary succeeds
    vi.mocked(stat).mockResolvedValueOnce({ isFile: () => true } as never);

    const result = await getPluginvalPath('/cache', platformConfig, 'darwin');

    expect(result).toBe('/cache/pluginval.app/Contents/MacOS/pluginval');
  });

  it('should throw when binary not found', async () => {
    // First stat call (expected path) fails
    vi.mocked(stat).mockRejectedValueOnce(new Error('ENOENT'));
    // readdir returns empty
    vi.mocked(readdir).mockResolvedValueOnce([] as never);

    await expect(getPluginvalPath('/cache', platformConfig, 'linux')).rejects.toThrow(
      "Pluginval binary not found. Run 'pnpm run setup-pluginval' first."
    );
  });
});
