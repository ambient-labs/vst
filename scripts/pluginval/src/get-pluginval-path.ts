import { readdir, stat } from 'fs/promises';
import path from 'path';
import type { PlatformConfig } from './load-config.js';

export const getPluginvalPath = async (
  cacheDir: string,
  platformConfig: PlatformConfig,
  platform: string
) => {
  const expectedPath = path.join(cacheDir, platformConfig.executable); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal

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
      const appBinaryPath = path.join(cacheDir, entry.name, 'Contents', 'MacOS', platformConfig.executable); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
      try {
        await stat(appBinaryPath);
        return appBinaryPath;
      } catch {
        // Not in app bundle
      }
    }

    // Check direct subdirectory
    const subPath = path.join(cacheDir, entry.name, platformConfig.executable); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
    try {
      await stat(subPath);
      return subPath;
    } catch {
      // Not in subdirectory
    }
  }

  throw new Error("Pluginval binary not found. Run 'pnpm run setup-pluginval' first.");
};
