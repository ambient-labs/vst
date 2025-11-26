#!/usr/bin/env node

import { existsSync, mkdirSync, chmodSync, createWriteStream, unlinkSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execFileSync } from 'child_process';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load config
const configPath = join(rootDir, 'tests', 'pluginval.config.json');
const config = JSON.parse(await readFile(configPath, 'utf-8'));

const PLUGINVAL_DIR = join(rootDir, config.cacheDir);
const platform = process.platform;

if (!config.platforms[platform]) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const platformConfig = config.platforms[platform];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          // Validate redirect URL is HTTPS
          if (!redirectUrl.startsWith('https://')) {
            reject(new Error('Redirect must use HTTPS'));
            return;
          }
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

function extractZip(zipPath, destDir) {
  if (platform === 'win32') {
    execFileSync('powershell', [
      '-command',
      'Expand-Archive',
      '-Path',
      zipPath,
      '-DestinationPath',
      destDir,
      '-Force'
    ], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'inherit' });
  }
}

function findBinary() {
  const expectedPath = join(PLUGINVAL_DIR, platformConfig.executable);

  // Check expected location first
  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  console.log('Binary not at expected location. Searching...');
  const files = readdirSync(PLUGINVAL_DIR, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      // Check for macOS app bundle
      if (platform === 'darwin' && file.name.endsWith('.app')) {
        const appBinaryPath = join(PLUGINVAL_DIR, file.name, 'Contents', 'MacOS', platformConfig.executable);
        if (existsSync(appBinaryPath)) {
          console.log(`Found binary in app bundle: ${appBinaryPath}`);
          return appBinaryPath;
        }
      }

      // Check direct subdirectory
      const subFiles = readdirSync(join(PLUGINVAL_DIR, file.name));
      if (subFiles.includes(platformConfig.executable)) {
        const foundPath = join(PLUGINVAL_DIR, file.name, platformConfig.executable);
        console.log(`Found binary in subdirectory: ${foundPath}`);
        return foundPath;
      }
    }
  }

  throw new Error(
    `Pluginval binary '${platformConfig.executable}' not found after extraction. ` +
    `Searched in: ${PLUGINVAL_DIR}`
  );
}

async function setup() {
  console.log(`Setting up pluginval ${config.version}...`);

  // Create cache directory
  if (!existsSync(PLUGINVAL_DIR)) {
    mkdirSync(PLUGINVAL_DIR, { recursive: true });
  }

  // Check if already set up
  try {
    const binaryPath = findBinary();
    console.log(`✓ pluginval already installed at: ${binaryPath}`);
    return binaryPath;
  } catch {
    // Not installed, continue with download
  }

  console.log(`Downloading from ${platformConfig.downloadUrl}...`);
  const zipPath = join(PLUGINVAL_DIR, 'pluginval.zip');

  try {
    await downloadFile(platformConfig.downloadUrl, zipPath);
    console.log('✓ Download complete');

    console.log('Extracting...');
    extractZip(zipPath, PLUGINVAL_DIR);
    console.log('✓ Extraction complete');

    // Clean up zip file
    unlinkSync(zipPath);

    // Find the binary
    const binaryPath = findBinary();

    // Make executable on Unix systems
    if (platform === 'darwin' || platform === 'linux') {
      chmodSync(binaryPath, 0o755);
      console.log('✓ Made binary executable');
    }

    console.log(`✓ pluginval ${config.version} installed at: ${binaryPath}`);
    return binaryPath;
  } catch (error) {
    // Clean up on error
    if (existsSync(zipPath)) {
      try {
        unlinkSync(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    console.error('✗ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
