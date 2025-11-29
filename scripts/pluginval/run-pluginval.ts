import { execFileSync } from 'child_process';

export interface PluginvalResult {
  success: boolean;
  output: string;
  exitCode?: number;
}

export const runPluginval = (
  pluginvalPath: string,
  pluginPath: string,
  args: string[]
): PluginvalResult => {
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

      const output = [execError.stdout, execError.stderr].filter(Boolean).join('\n');

      return {
        success: false,
        output,
        exitCode: execError.status,
      };
    }
    throw error;
  }
};
