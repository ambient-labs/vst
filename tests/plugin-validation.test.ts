import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, chmodSync, createWriteStream, unlinkSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import https from 'https';

const PLUGINVAL_VERSION = 'v1.0.3';
const PLUGINVAL_DIR = join(process.cwd(), 'node_modules', '.cache', 'pluginval');
const BUILD_TYPE = process.env.BUILD_TYPE || 'Release';
const PLUGIN_NAME = 'SRVB';

interface PlatformConfig {
  pluginvalUrl: string;
  pluginvalExe: string;
  unzipCommand: string[];
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  darwin: {
    pluginvalUrl: `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_macOS.zip`,
    pluginvalExe: 'pluginval',
    unzipCommand: ['unzip', '-o'],
  },
  linux: {
    pluginvalUrl: `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_Linux.zip`,
    pluginvalExe: 'pluginval',
    unzipCommand: ['unzip', '-o'],
  },
  win32: {
    pluginvalUrl: `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_Windows.zip`,
    pluginvalExe: 'pluginval.exe',
    unzipCommand: ['powershell', '-command', 'Expand-Archive'],
  },
};

function getPlatformConfig(): PlatformConfig {
  const config = PLATFORM_CONFIGS[process.platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
  return config;
}

function getPluginvalExecutable(): string {
  const config = getPlatformConfig();
  return join(PLUGINVAL_DIR, config.pluginvalExe);
}

function getPluginPath(): string {
  return join(
    process.cwd(),
    'native',
    'build',
    'scripted',
    `${PLUGIN_NAME}_artefacts`,
    BUILD_TYPE,
    'VST3',
    `${PLUGIN_NAME}.vst3`
  );
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = createWriteStream(dest);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();

        // Validate file was actually downloaded
        try {
          const stats = statSync(dest);
          if (stats.size === 0) {
            reject(new Error('Downloaded file is empty'));
            return;
          }
        } catch (err) {
          reject(err);
          return;
        }

        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const config = getPlatformConfig();

  if (process.platform === 'win32') {
    // Windows PowerShell extraction
    execFileSync('powershell', [
      '-command',
      'Expand-Archive',
      '-Path',
      zipPath,
      '-DestinationPath',
      destDir,
      '-Force'
    ], { stdio: 'ignore' });
  } else {
    // Unix-like systems (macOS, Linux)
    execFileSync('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'ignore' });
  }
}

async function downloadPluginval(): Promise<string> {
  const pluginvalExe = getPluginvalExecutable();

  // Check if already downloaded
  if (existsSync(pluginvalExe)) {
    console.log('pluginval already downloaded');
    return pluginvalExe;
  }

  const config = getPlatformConfig();
  console.log(`Downloading pluginval ${PLUGINVAL_VERSION}...`);

  // Create cache directory
  if (!existsSync(PLUGINVAL_DIR)) {
    mkdirSync(PLUGINVAL_DIR, { recursive: true });
  }

  // Download pluginval
  const zipPath = join(PLUGINVAL_DIR, 'pluginval.zip');

  try {
    await downloadFile(config.pluginvalUrl, zipPath);

    // Extract
    console.log('Extracting pluginval...');
    await extractZip(zipPath, PLUGINVAL_DIR);

    // Clean up zip file
    unlinkSync(zipPath);

    // Verify extraction succeeded
    if (!existsSync(pluginvalExe)) {
      // List directory contents for debugging
      console.log('Binary not at expected location. Searching in extracted files...');
      const files = readdirSync(PLUGINVAL_DIR, { withFileTypes: true });
      console.log('Directory contents:', files.map(f => f.name).join(', '));

      // Try to find the binary in subdirectories
      let foundPath: string | null = null;
      for (const file of files) {
        if (file.isDirectory()) {
          const subFiles = readdirSync(join(PLUGINVAL_DIR, file.name));
          console.log(`Contents of ${file.name}:`, subFiles.join(', '));

          const binaryName = config.pluginvalExe;
          if (subFiles.includes(binaryName)) {
            foundPath = join(PLUGINVAL_DIR, file.name, binaryName);
            console.log(`Found binary at: ${foundPath}`);
            break;
          }
        } else if (file.name === config.pluginvalExe) {
          foundPath = join(PLUGINVAL_DIR, file.name);
          console.log(`Found binary at root: ${foundPath}`);
          break;
        }
      }

      if (!foundPath || !existsSync(foundPath)) {
        throw new Error(
          `Pluginval binary '${config.pluginvalExe}' not found after extraction. ` +
          `Expected at: ${pluginvalExe}. ` +
          `Searched in: ${PLUGINVAL_DIR} and subdirectories.`
        );
      }

      // Make executable and return the found path
      if (process.platform === 'darwin' || process.platform === 'linux') {
        chmodSync(foundPath, 0o755);
      }
      console.log('pluginval ready');
      return foundPath;
    }

    // Make executable on Unix systems
    if (process.platform === 'darwin' || process.platform === 'linux') {
      chmodSync(pluginvalExe, 0o755);
    }

    console.log('pluginval ready');
    return pluginvalExe;
  } catch (error) {
    // Clean up partial download on error
    if (existsSync(zipPath)) {
      try {
        unlinkSync(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
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
    // Handle execution errors with proper type checking
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

  beforeAll(async () => {
    // Download pluginval if needed
    pluginvalPath = await downloadPluginval();
    pluginPath = getPluginPath();

    // Verify plugin exists
    if (!existsSync(pluginPath)) {
      throw new Error(
        `Plugin not found at ${pluginPath}. Run 'pnpm run build' first.`
      );
    }

    console.log(`Plugin path: ${pluginPath}`);
    console.log(`pluginval path: ${pluginvalPath}`);
  }, 120000); // Allow 2 minutes for download

  it('should pass pluginval VST3 compliance tests', async () => {
    console.log('Running pluginval on VST3 plugin...');

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '10',
      '--validate-in-process',
      '--output-dir',
      PLUGINVAL_DIR,
      '--vst3',
    ]);

    console.log('pluginval output:', output);

    // pluginval exits with code 0 on success, non-zero on failure
    // The successful execution of runPluginval (without throwing) means validation passed
    expect(output).toBeDefined();

    // Optional: Check for success indicators in output
    // (pluginval's exit code is the primary indicator)
    expect(output.length).toBeGreaterThan(0);
  }, 180000); // Allow 3 minutes for validation

  it('should load and unload without crashes', async () => {
    console.log('Testing plugin loading stability...');

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '5',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Load test output:', output);

    // Successful execution means no crashes occurred
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  }, 90000); // Allow 90 seconds

  it('should handle parameter changes correctly', async () => {
    console.log('Testing parameter handling...');

    const output = runPluginval(pluginvalPath, pluginPath, [
      '--strictness-level',
      '7',
      '--random-seed',
      '42',
      '--timeout-ms',
      '30000',
      '--vst3',
    ]);

    console.log('Parameter test output:', output);

    // Successful execution means parameter handling passed
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  }, 90000);
});
