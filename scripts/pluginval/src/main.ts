import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './load-config.js';
import { setup } from './setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.join(__dirname, '..');
const rootDir = path.join(packageDir, '../..');

export const main = async () => {
  const configPath = path.join(packageDir, 'config.json');
  const config = await loadConfig(configPath);

  const cacheDir = path.join(rootDir, config.cacheDir);
  const platform = process.platform;

  if (!config.platforms[platform]) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  const platformConfig = config.platforms[platform];

  try {
    await setup({
      config,
      platformConfig,
      platform,
      cacheDir,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Setup failed:', errorMessage);
    process.exit(1);
  }
};
