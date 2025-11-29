import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as _ChildProcessModule from 'child_process';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _ChildProcessModule;
  return {
    ...actual,
    execFileSync: mocks.execFileSync,
  };
});

import { runPluginval } from './run-pluginval.js';

describe('runPluginval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success result for successful command', () => {
    mocks.execFileSync.mockReturnValueOnce('Validation passed\n');

    const result = runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', ['--validate']);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('Validation passed\n');
    expect(mocks.execFileSync).toHaveBeenCalledWith(
      '/path/to/pluginval',
      ['--validate', '/path/to/plugin.vst3'],
      expect.objectContaining({
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
      })
    );
  });

  it('should return failure result with exit code for failed command', () => {
    const execError = Object.assign(new Error('Command failed'), {
      stdout: 'some output',
      stderr: 'validation error',
      status: 1,
    });
    mocks.execFileSync.mockImplementationOnce(() => {
      throw execError;
    });

    const result = runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('some output');
    expect(result.output).toContain('validation error');
  });

  it('should return failure for non-existent command', () => {
    const execError = Object.assign(new Error('ENOENT'), {
      stdout: '',
      stderr: 'command not found',
      status: 127,
    });
    mocks.execFileSync.mockImplementationOnce(() => {
      throw execError;
    });

    const result = runPluginval('/nonexistent/command', '/path/to/plugin.vst3', []);

    expect(result.success).toBe(false);
  });

  it('should rethrow non-Error exceptions', () => {
    mocks.execFileSync.mockImplementationOnce(() => {
      throw 'string error';
    });

    expect(() => runPluginval('/path/to/pluginval', '/path/to/plugin.vst3', [])).toThrow(
      'string error'
    );
  });
});
