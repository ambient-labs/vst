#!/usr/bin/env tsx

import { chmod, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './load-config.js';
import { getPluginvalPath } from './get-pluginval-path.js';
import { downloadFile } from './download-file.js';
import { extractZip } from './extract-zip.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

const configPath = join(__dirname, 'config.json');
const config = await loadConfig(configPath);

const PLUGINVAL_DIR = join(rootDir, config.cacheDir);
const platform = process.platform;

if (!config.platforms[platform]) {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

const platformConfig = config.platforms[platform];

const tryGetPluginvalPath = async () => {
  try {
    return await getPluginvalPath(PLUGINVAL_DIR, platformConfig, platform);
  } catch {
    return null;
  }
};

const setup = async () => {
  console.log(`Setting up pluginval ${config.version}...`);

  await mkdir(PLUGINVAL_DIR, { recursive: true });

  const existingPath = await tryGetPluginvalPath();
  if (existingPath) {
    console.log(`✓ pluginval already installed at: ${existingPath}`);
    return existingPath;
  }

  console.log(`Downloading from ${platformConfig.downloadUrl}...`);
  const zipPath = join(PLUGINVAL_DIR, 'pluginval.zip');

  try {
    await downloadFile(platformConfig.downloadUrl, zipPath);
    console.log('✓ Download complete');

    console.log('Extracting...');
    await extractZip(zipPath, PLUGINVAL_DIR);
    console.log('✓ Extraction complete');

    await unlink(zipPath);

    const binaryPath = await getPluginvalPath(PLUGINVAL_DIR, platformConfig, platform);

    if (platform === 'darwin' || platform === 'linux') {
      await chmod(binaryPath, 0o755);
      console.log('✓ Made binary executable');
    }

    console.log(`✓ pluginval ${config.version} installed at: ${binaryPath}`);
    return binaryPath;
  } catch (error) {
    if (existsSync(zipPath)) {
      try {
        await unlink(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Setup failed:', errorMessage);
    process.exit(1);
  }
};

setup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
