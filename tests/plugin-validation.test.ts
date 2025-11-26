import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { readFile } from 'fs/promises';

// Load pluginval configuration
const configPath = join(process.cwd(), 'tests', 'pluginval.config.json');
const config = JSON.parse(await readFile(configPath, 'utf-8'));

const PLUGINVAL_DIR = join(process.cwd(), config.cacheDir);
const BUILD_TYPE = process.env.BUILD_TYPE || 'Release';
const platformConfig = config.platforms[process.platform];

if (!platformConfig) {
  throw new Error(`Unsupported platform: ${process.platform}`);
}

function getPluginvalPath(): string {
  const expectedPath = join(PLUGINVAL_DIR, platformConfig.executable);

  // Check expected location first
  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  // Search for binary in subdirectories
  const files = readdirSync(PLUGINVAL_DIR, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      // Check for macOS app bundle
      if (process.platform === 'darwin' && file.name.endsWith('.app')) {
        const appBinaryPath = join(PLUGINVAL_DIR, file.name, 'Contents', 'MacOS', platformConfig.executable);
        if (existsSync(appBinaryPath)) {
          return appBinaryPath;
        }
      }

      // Check direct subdirectory
      const subFiles = readdirSync(join(PLUGINVAL_DIR, file.name));
      if (subFiles.includes(platformConfig.executable)) {
        return join(PLUGINVAL_DIR, file.name, platformConfig.executable);
      }
    }
  }

  throw new Error(
    `Pluginval binary not found. Run 'pnpm run setup-pluginval' first.`
  );
}

function getPluginPath(): string {
  return join(
    process.cwd(),
    'native',
    'build',
    'scripted',
    `${config.pluginName}_artefacts`,
    BUILD_TYPE,
    'VST3',
    `${config.pluginName}.vst3`
  );
}

function runPluginval(pluginvalPath: string, pluginPath: string, args: string[]): string {
  try {
    const output = execFileSync(
      pluginvalPath,
      [...args, pluginPath],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
      }
    );
    return output;
  } catch (error) {
    if (error instanceof Error) {
      const execError = error as Error & { stdout?: string; stderr?: string; status?: number };

      console.error('pluginval execution failed');
      if (execError.stdout) {
        console.error('stdout:', execError.stdout);
      }
      if (execError.stderr) {
        console.error('stderr:', execError.stderr);
      }

      throw new Error(
        `Plugin validation failed with exit code ${execError.status ?? 'unknown'}: ${error.message}`
      );
    }
    throw error;
  }
}

describe('Plugin Validation', () => {
  let pluginvalPath: string;
  let pluginPath: string;

  beforeAll(() => {
    pluginvalPath = getPluginvalPath();
    pluginPath = getPluginPath();

    // Verify plugin exists
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

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '10',
      '--skip-gui-tests',
      '--output-dir',
      PLUGINVAL_DIR,
      '--vst3',
    ]);

    console.log('pluginval output:', output);
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  }, 180000);

  it('should load and unload without crashes', () => {
    console.log('Testing plugin loading stability...');

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '5',
      '--skip-gui-tests',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Load test output:', output);
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  }, 90000);

  it('should handle parameter changes correctly', () => {
    console.log('Testing parameter handling...');

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '7',
      '--skip-gui-tests',
      '--random-seed',
      '42',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Parameter test output:', output);
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  }, 90000);
});
