import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { PlatformConfig } from './load-config.js';

export function getPluginvalPath(
  cacheDir: string,
  platformConfig: PlatformConfig,
  platform: string
): string {
  const expectedPath = join(cacheDir, platformConfig.executable);

  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  const files = readdirSync(cacheDir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      if (platform === 'darwin' && file.name.endsWith('.app')) {
        const appBinaryPath = join(
          cacheDir,
          file.name,
          'Contents',
          'MacOS',
          platformConfig.executable
        );
        if (existsSync(appBinaryPath)) {
          return appBinaryPath;
        }
      }

      const subFiles = readdirSync(join(cacheDir, file.name));
      if (subFiles.includes(platformConfig.executable)) {
        return join(cacheDir, file.name, platformConfig.executable);
      }
    }
  }

  throw new Error(
    "Pluginval binary not found. Run 'pnpm run setup-pluginval' first."
  );
}
