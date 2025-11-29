import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { PlatformConfig } from './load-config.js';

export const getPluginvalPath = async (
  cacheDir: string,
  platformConfig: PlatformConfig,
  platform: string
) => {
  const expectedPath = join(cacheDir, platformConfig.executable);

  try {
    await stat(expectedPath);
    return expectedPath;
  } catch {
    // Not at expected path, search directories
  }

  const entries = await readdir(cacheDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Check for macOS app bundle
    if (platform === 'darwin' && entry.name.endsWith('.app')) {
      const appBinaryPath = join(
        cacheDir,
        entry.name,
        'Contents',
        'MacOS',
        platformConfig.executable
      );
      try {
        await stat(appBinaryPath);
        return appBinaryPath;
      } catch {
        // Not in app bundle
      }
    }

    // Check direct subdirectory
    const subPath = join(cacheDir, entry.name, platformConfig.executable);
    try {
      await stat(subPath);
      return subPath;
    } catch {
      // Not in subdirectory
    }
  }

  throw new Error("Pluginval binary not found. Run 'pnpm run setup-pluginval' first.");
};
