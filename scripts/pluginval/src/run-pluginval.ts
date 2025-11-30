import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface PluginvalResult {
  success: boolean;
  output: string;
  exitCode?: number;
}

export const runPluginval = async (
  pluginvalPath: string,
  pluginPath: string,
  args: string[]
): Promise<PluginvalResult> => {
  try {
    const { stdout, stderr } = await execFileAsync(pluginvalPath, [...args, pluginPath], {
      encoding: 'utf-8',
      timeout: 120000,
    });
    const output = [stdout, stderr].filter(Boolean).join('\n');
    return { success: true, output, exitCode: 0 };
  } catch (error) {
    if (error instanceof Error) {
      const execError = error as Error & {
        stdout?: string;
        stderr?: string;
        code?: number;
      };

      const output = [execError.stdout, execError.stderr].filter(Boolean).join('\n');

      return {
        success: false,
        output,
        exitCode: execError.code,
      };
    }
    throw error;
  }
};
