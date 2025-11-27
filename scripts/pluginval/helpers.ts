import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

export function getPluginPath(
  rootDir: string,
  pluginName: string,
  buildType: string = 'Release'
): string {
  return join(
    rootDir,
    'native',
    'build',
    'scripted',
    `${pluginName}_artefacts`,
    buildType,
    'VST3',
    `${pluginName}.vst3`
  );
}

export interface PluginvalResult {
  success: boolean;
  output: string;
  exitCode?: number;
}

export function runPluginval(
  pluginvalPath: string,
  pluginPath: string,
  args: string[]
): PluginvalResult {
  try {
    const output = execFileSync(pluginvalPath, [...args, pluginPath], {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000,
    });
    return { success: true, output, exitCode: 0 };
  } catch (error) {
    if (error instanceof Error) {
      const execError = error as Error & {
        stdout?: string;
        stderr?: string;
        status?: number;
      };

      const output = [execError.stdout, execError.stderr]
        .filter(Boolean)
        .join('\n');

      return {
        success: false,
        output,
        exitCode: execError.status,
      };
    }
    throw error;
  }
}
