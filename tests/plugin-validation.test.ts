import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../scripts/pluginval/load-config.js';
import { getPluginvalPath } from '../scripts/pluginval/get-pluginval-path.js';
import { getPluginPath } from '../scripts/pluginval/get-plugin-path.js';
import { runPluginval } from '../scripts/pluginval/run-pluginval.js';

const configPath = join(process.cwd(), 'scripts', 'pluginval', 'config.json');
const config = await loadConfig(configPath);

const PLUGINVAL_DIR = join(process.cwd(), config.cacheDir);
const BUILD_TYPE = process.env.BUILD_TYPE || 'Release';
const platformConfig = config.platforms[process.platform];

if (!platformConfig) {
  throw new Error(`Unsupported platform: ${process.platform}`);
}

describe('Plugin Validation', () => {
  let pluginvalPath: string;
  let pluginPath: string;

  beforeAll(() => {
    pluginvalPath = getPluginvalPath(
      PLUGINVAL_DIR,
      platformConfig,
      process.platform
    );
    pluginPath = getPluginPath(process.cwd(), config.pluginName, BUILD_TYPE);

    if (!existsSync(pluginPath)) {
      throw new Error(
        `Plugin not found at ${pluginPath}. Run 'pnpm run build' first.`
      );
    }

    console.log(`Plugin: ${pluginPath}`);
    console.log(`Pluginval: ${pluginvalPath}`);
  });

  it('should pass pluginval VST3 compliance tests', () => {
    console.log('Running pluginval on VST3 plugin...');

    const result = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '10',
      '--skip-gui-tests',
      '--output-dir',
      PLUGINVAL_DIR,
      '--vst3',
    ]);

    console.log('pluginval output:', result.output);

    if (!result.success) {
      throw new Error(
        `Plugin validation failed with exit code ${result.exitCode ?? 'unknown'}: ${result.output}`
      );
    }

    expect(result.output).toBeDefined();
    expect(result.output.length).toBeGreaterThan(0);
  }, 180000);

  it('should load and unload without crashes', () => {
    console.log('Testing plugin loading stability...');

    const result = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '5',
      '--skip-gui-tests',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Load test output:', result.output);

    if (!result.success) {
      throw new Error(
        `Plugin load test failed with exit code ${result.exitCode ?? 'unknown'}: ${result.output}`
      );
    }

    expect(result.output).toBeDefined();
    expect(result.output.length).toBeGreaterThan(0);
  }, 90000);

  it('should handle parameter changes correctly', () => {
    console.log('Testing parameter handling...');

    const result = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '7',
      '--skip-gui-tests',
      '--random-seed',
      '42',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Parameter test output:', result.output);

    if (!result.success) {
      throw new Error(
        `Parameter handling test failed with exit code ${result.exitCode ?? 'unknown'}: ${result.output}`
      );
    }

    expect(result.output).toBeDefined();
    expect(result.output.length).toBeGreaterThan(0);
  }, 90000);
});
