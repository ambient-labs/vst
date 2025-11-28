import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { loadConfig } from './load-config.js';

describe('loadConfig', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'load-config-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load and parse a valid config file', async () => {
    const testConfigPath = join(testDir, 'test-config.json');
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

    await writeFile(testConfigPath, JSON.stringify(testConfig));

    const config = await loadConfig(testConfigPath);

    expect(config.version).toBe('v1.0.0');
    expect(config.cacheDir).toBe('node_modules/.cache/test');
    expect(config.pluginName).toBe('TestPlugin');
    expect(config.platforms.darwin.executable).toBe('pluginval');
  });

  it('should throw on invalid JSON', async () => {
    const testConfigPath = join(testDir, 'invalid-config.json');
    await writeFile(testConfigPath, 'not valid json');

    await expect(loadConfig(testConfigPath)).rejects.toThrow();
  });

  it('should throw on missing file', async () => {
    await expect(loadConfig('/nonexistent/config.json')).rejects.toThrow();
  });
});
