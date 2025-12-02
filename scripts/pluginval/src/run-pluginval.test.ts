import { describe, test, expect, vi } from 'vitest';
import { execFile } from 'child_process';
import type { promisify as promisifyType } from 'util';

const mockExecFileAsync = vi.hoisted(() => vi.fn());

vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: ((fn: unknown) => {
      if (fn === execFile) {
        return mockExecFileAsync;
      }
      return actual.promisify(fn as Parameters<typeof promisifyType>[0]);
    }) as typeof promisifyType,
  };
});

import { runPluginval } from './run-pluginval.js';

describe('runPluginval', () => {
  test('should return success result for successful command', async () => {
    mockExecFileAsync.mockResolvedValueOnce({
      stdout: 'Validation passed\n',
      stderr: '',
    });

    const result = await runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', ['--validate']);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('Validation passed\n');
    expect(mockExecFileAsync).toHaveBeenCalledWith(
      '/path/to/pluginval',
      ['--validate', '/path/to/plugin.vst3'],
      expect.objectContaining({
        encoding: 'utf-8',
        timeout: 120000,
      })
    );
  });

  test('should return failure result with exit code for failed command', async () => {
    const execError = Object.assign(new Error('Command failed'), {
      stdout: 'some output',
      stderr: 'validation error',
      code: 1,
    });
    mockExecFileAsync.mockRejectedValueOnce(execError);

    const result = await runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('some output');
    expect(result.output).toContain('validation error');
  });

  test('should return failure for non-existent command', async () => {
    const execError = Object.assign(new Error('ENOENT'), {
      stdout: '',
      stderr: 'command not found',
      code: 127,
    });
    mockExecFileAsync.mockRejectedValueOnce(execError);

    const result = await runPluginval('/nonexistent/command', '/path/to/plugin.vst3', []);

    expect(result.success).toBe(false);
  });

  test('should rethrow non-Error exceptions', async () => {
    mockExecFileAsync.mockRejectedValueOnce('string error');

    await expect(runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', [])).rejects.toThrow(
      'string error'
    );
  });
});
