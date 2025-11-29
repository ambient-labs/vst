import { describe, it, expect } from 'vitest';
import { runPluginval } from './run-pluginval.js';

describe('runPluginval', () => {
  it('should return success result for successful command', () => {
    const result = runPluginval('/bin/echo', '', ['hello']);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello');
  });

  it('should return failure result for failed command', () => {
    const result = runPluginval('/bin/false', '', []);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should return failure for non-existent command', () => {
    const result = runPluginval('/nonexistent/command', '', []);

    expect(result.success).toBe(false);
  });

  it('should include stdout in output on success', () => {
    const result = runPluginval('/bin/echo', '', ['test', 'output']);

    expect(result.success).toBe(true);
    expect(result.output).toContain('test');
    expect(result.output).toContain('output');
  });
});
