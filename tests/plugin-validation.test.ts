import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, chmodSync, createWriteStream } from 'fs';
import { join } from 'path';
import https from 'https';

const PLUGINVAL_VERSION = 'v1.0.3';
const PLUGINVAL_DIR = join(process.cwd(), 'node_modules', '.cache', 'pluginval');
const BUILD_TYPE = process.env.BUILD_TYPE || 'Release';

function getPluginvalUrl(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_macOS.zip`;
  } else if (platform === 'linux') {
    return `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_Linux.zip`;
  } else if (platform === 'win32') {
    return `https://github.com/Tracktion/pluginval/releases/download/${PLUGINVAL_VERSION}/pluginval_Windows.zip`;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function getPluginvalExecutable(): string {
  const platform = process.platform;

  if (platform === 'darwin' || platform === 'linux') {
    return join(PLUGINVAL_DIR, 'pluginval');
  } else if (platform === 'win32') {
    return join(PLUGINVAL_DIR, 'pluginval.exe');
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function getPluginPath(): string {
  const platform = process.platform;
  const pluginName = 'SRVB';

  if (platform === 'darwin') {
    return join(process.cwd(), 'native', 'build', 'scripted', `${pluginName}_artefacts`, BUILD_TYPE, 'VST3', `${pluginName}.vst3`);
  } else if (platform === 'linux') {
    return join(process.cwd(), 'native', 'build', 'scripted', `${pluginName}_artefacts`, BUILD_TYPE, 'VST3', `${pluginName}.vst3`);
  } else if (platform === 'win32') {
    return join(process.cwd(), 'native', 'build', 'scripted', `${pluginName}_artefacts`, BUILD_TYPE, 'VST3', `${pluginName}.vst3`);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
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
        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Use unzip command on macOS/Linux
  if (process.platform === 'darwin' || process.platform === 'linux') {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'ignore' });
  } else if (process.platform === 'win32') {
    // On Windows, use PowerShell's Expand-Archive
    execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'ignore' });
  }
}

async function downloadPluginval(): Promise<string> {
  const pluginvalExe = getPluginvalExecutable();

  // Check if already downloaded
  if (existsSync(pluginvalExe)) {
    console.log('pluginval already downloaded');
    return pluginvalExe;
  }

  console.log('Downloading pluginval...');

  // Create cache directory
  if (!existsSync(PLUGINVAL_DIR)) {
    mkdirSync(PLUGINVAL_DIR, { recursive: true });
  }

  // Download pluginval
  const url = getPluginvalUrl();
  const zipPath = join(PLUGINVAL_DIR, 'pluginval.zip');

  await downloadFile(url, zipPath);

  // Extract
  console.log('Extracting pluginval...');
  await extractZip(zipPath, PLUGINVAL_DIR);

  // Make executable on Unix systems
  if (process.platform === 'darwin' || process.platform === 'linux') {
    chmodSync(pluginvalExe, 0o755);
  }

  console.log('pluginval ready');
  return pluginvalExe;
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
      throw new Error(`Plugin not found at ${pluginPath}. Run 'pnpm run build' first.`);
    }

    console.log(`Plugin path: ${pluginPath}`);
    console.log(`pluginval path: ${pluginvalPath}`);
  }, 120000); // Allow 2 minutes for download

  it('should pass pluginval VST3 compliance tests', async () => {
    console.log('Running pluginval on VST3 plugin...');

    try {
      // Run pluginval with strict validation
      const output = execSync(
        `"${pluginvalPath}" --strictness-level 10 --validate-in-process --output-dir "${PLUGINVAL_DIR}" --vst3 "${pluginPath}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 120000, // 2 minute timeout
        }
      );

      console.log('pluginval output:', output);

      // Check output for success indicators
      expect(output).toContain('Validation complete');

      // Make sure there are no failures
      expect(output.toLowerCase()).not.toContain('fail');
      expect(output.toLowerCase()).not.toContain('error');
    } catch (error: any) {
      // If pluginval returns non-zero exit code, the validation failed
      console.error('pluginval failed:');
      console.error(error.stdout || error.message);
      console.error(error.stderr);
      throw new Error(`Plugin validation failed: ${error.message}`);
    }
  }, 180000); // Allow 3 minutes for validation

  it('should load and unload without crashes', async () => {
    console.log('Testing plugin loading stability...');

    try {
      // Run quick load test
      const output = execSync(
        `"${pluginvalPath}" --strictness-level 5 --timeout-ms 30000 --vst3 "${pluginPath}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000,
        }
      );

      console.log('Load test output:', output);

      // Verify no crashes
      expect(output).toBeDefined();
      expect(output.toLowerCase()).not.toContain('crash');
      expect(output.toLowerCase()).not.toContain('hang');
    } catch (error: any) {
      console.error('Load test failed:');
      console.error(error.stdout || error.message);
      console.error(error.stderr);
      throw new Error(`Plugin load test failed: ${error.message}`);
    }
  }, 90000); // Allow 90 seconds

  it('should handle parameter changes correctly', async () => {
    console.log('Testing parameter handling...');

    try {
      // Run with randomised parameters
      const output = execSync(
        `"${pluginvalPath}" --strictness-level 7 --random-seed 42 --timeout-ms 30000 --vst3 "${pluginPath}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000,
        }
      );

      console.log('Parameter test output:', output);

      // Verify successful parameter testing
      expect(output).toBeDefined();
      expect(output.toLowerCase()).not.toContain('parameter error');
    } catch (error: any) {
      console.error('Parameter test failed:');
      console.error(error.stdout || error.message);
      console.error(error.stderr);
      throw new Error(`Plugin parameter test failed: ${error.message}`);
    }
  }, 90000);
});
