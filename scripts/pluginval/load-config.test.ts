import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { loadConfig } from './load-config.js';

const TEST_DIR = join(process.cwd(), 'node_modules/.cache/load-config-test');

describe('loadConfig', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should load and parse a valid config file', async () => {
    const testConfigPath = join(TEST_DIR, 'test-config.json');
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
    const testConfigPath = join(TEST_DIR, 'invalid-config.json');
    writeFileSync(testConfigPath, 'not valid json');

    await expect(loadConfig(testConfigPath)).rejects.toThrow();
  });

  it('should throw on missing file', async () => {
    await expect(loadConfig('/nonexistent/config.json')).rejects.toThrow();
  });
});
