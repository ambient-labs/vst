import { chmod, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getPluginvalPath } from './get-pluginval-path.js';
import { downloadFile } from './download-file.js';
import extractZip from 'extract-zip';
import type { Config, PlatformConfig } from './load-config.js';

export interface SetupOptions {
  config: Config;
  platformConfig: PlatformConfig;
  platform: NodeJS.Platform;
  cacheDir: string;
  logger?: {
    log: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export interface SetupResult {
  binaryPath: string;
  wasAlreadyInstalled: boolean;
}

const tryGetPluginvalPath = async (
  cacheDir: string,
  platformConfig: PlatformConfig,
  platform: NodeJS.Platform
): Promise<string | null> => {
  try {
    return await getPluginvalPath(cacheDir, platformConfig, platform);
  } catch {
    return null;
  }
};

export const setup = async (options: SetupOptions): Promise<SetupResult> => {
  const { config, platformConfig, platform, cacheDir, logger = console } = options;

  logger.log(`Setting up pluginval ${config.version}...`);

  await mkdir(cacheDir, { recursive: true });

  const existingPath = await tryGetPluginvalPath(cacheDir, platformConfig, platform);
  if (existingPath) {
    logger.log(`✓ pluginval already installed at: ${existingPath}`);
    return { binaryPath: existingPath, wasAlreadyInstalled: true };
  }

  logger.log(`Downloading from ${platformConfig.downloadUrl}...`);
  const zipPath = join(cacheDir, 'pluginval.zip');

  try {
    await downloadFile(platformConfig.downloadUrl, zipPath);
    logger.log('✓ Download complete');

    logger.log('Extracting...');
    await extractZip(zipPath, { dir: cacheDir });
    logger.log('✓ Extraction complete');

    await unlink(zipPath);

    const binaryPath = await getPluginvalPath(cacheDir, platformConfig, platform);

    if (platform === 'darwin' || platform === 'linux') {
      await chmod(binaryPath, 0o755);
      logger.log('✓ Made binary executable');
    }

    logger.log(`✓ pluginval ${config.version} installed at: ${binaryPath}`);
    return { binaryPath, wasAlreadyInstalled: false };
  } catch (error) {
    if (existsSync(zipPath)) {
      try {
        await unlink(zipPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
};
