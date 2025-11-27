#!/usr/bin/env tsx

import { existsSync, mkdirSync, chmodSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, type Config } from './load-config.js';
import { getPluginvalPath } from './get-pluginval-path.js';
import { downloadFile } from './download-file.js';
import { extractZip } from './extract-zip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const configPath = join(__dirname, 'config.json');
const config: Config = await loadConfig(configPath);

const PLUGINVAL_DIR = join(rootDir, config.cacheDir);
const platform = process.platform as string;

if (!config.platforms[platform]) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const platformConfig = config.platforms[platform];

async function setup(): Promise<string> {
  console.log(`Setting up pluginval ${config.version}...`);

  if (!existsSync(PLUGINVAL_DIR)) {
    mkdirSync(PLUGINVAL_DIR, { recursive: true });
  }

  try {
    const binaryPath = getPluginvalPath(PLUGINVAL_DIR, platformConfig, platform);
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
    extractZip(zipPath, PLUGINVAL_DIR, platform);
    console.log('✓ Extraction complete');

    unlinkSync(zipPath);

    const binaryPath = getPluginvalPath(PLUGINVAL_DIR, platformConfig, platform);

    if (platform === 'darwin' || platform === 'linux') {
      chmodSync(binaryPath, 0o755);
      console.log('✓ Made binary executable');
    }

    console.log(`✓ pluginval ${config.version} installed at: ${binaryPath}`);
    return binaryPath;
  } catch (error) {
    if (existsSync(zipPath)) {
      try {
        unlinkSync(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Setup failed:', errorMessage);
    process.exit(1);
  }
}

setup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
