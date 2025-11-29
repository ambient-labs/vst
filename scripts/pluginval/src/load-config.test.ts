import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as _FsPromisesModule from 'fs/promises';

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _FsPromisesModule;
  return {
    ...actual,
    readFile: mocks.readFile,
  };
});

import { loadConfig } from './load-config.js';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    mocks.readFile.mockResolvedValueOnce(JSON.stringify(testConfig));

    const config = await loadConfig('/path/to/config.json');

    expect(config.version).toBe('v1.0.0');
    expect(config.cacheDir).toBe('node_modules/.cache/test');
    expect(config.pluginName).toBe('TestPlugin');
    expect(config.platforms.darwin.executable).toBe('pluginval');
    expect(mocks.readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
  });

  it('should throw on invalid JSON', async () => {
    mocks.readFile.mockResolvedValueOnce('not valid json');

    await expect(loadConfig('/path/to/invalid.json')).rejects.toThrow();
  });

  it('should throw on missing file', async () => {
    mocks.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

    await expect(loadConfig('/nonexistent/config.json')).rejects.toThrow('ENOENT');
  });
});
