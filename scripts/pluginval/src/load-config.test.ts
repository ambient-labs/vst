import { describe, test, expect, vi } from 'vitest';
import { readFile } from 'fs/promises';

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

import { loadConfig } from './load-config.js';

describe('loadConfig', () => {
  test('should load and parse a valid config file', async () => {
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

    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(testConfig));

    const config = await loadConfig('/path/to/config.json');

    expect(config.version).toBe('v1.0.0');
    expect(config.cacheDir).toBe('node_modules/.cache/test');
    expect(config.pluginName).toBe('TestPlugin');
    expect(config.platforms.darwin.executable).toBe('pluginval');
    expect(readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
  });

  test('should throw on invalid JSON', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('not valid json');

    await expect(loadConfig('/path/to/invalid.json')).rejects.toThrow();
  });

  test('should throw on missing file', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT: no such file'));

    await expect(loadConfig('/nonexistent/config.json')).rejects.toThrow('ENOENT');
  });
});
