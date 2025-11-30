import { readFile } from 'fs/promises';

export interface PlatformConfig {
  downloadUrl: string;
  executable: string;
  isAppBundle: boolean;
}

export interface Config {
  version: string;
  cacheDir: string;
  pluginName: string;
  platforms: Record<string, PlatformConfig>;
}

export async function loadConfig(configPath: string): Promise<Config> {
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content) as Config;
}
