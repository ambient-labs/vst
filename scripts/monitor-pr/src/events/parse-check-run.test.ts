import { describe, it, expect } from 'vitest';
import { parseCheckRun } from './parse-check-run.js';

describe('parseCheckRun', () => {
  const basePayload = {
    action: 'completed',
    check_run: {
      name: 'test',
      status: 'completed',
      conclusion: 'success',
      pull_requests: [{ number: 42 }],
    },
  };

  it('should parse check_run for matching PR', () => {
    const result = parseCheckRun(basePayload, 42, new Set());
    expect(result).toEqual({
      event: 'ci',
      check: 'test',
      status: 'completed',
      conclusion: 'success',
    });
  });

  it('should return null for non-matching PR', () => {
    const result = parseCheckRun(basePayload, 99, new Set());
    expect(result).toBeNull();
  });

  it('should normalize status values', () => {
    const payload = {
      ...basePayload,
      check_run: {
        ...basePayload.check_run,
        status: 'QUEUED',
        conclusion: null,
      },
    };
    const result = parseCheckRun(payload, 42, new Set());
    expect(result?.status).toBe('queued');
    expect(result?.conclusion).toBeNull();
  });

  it('should handle in_progress status', () => {
    const payload = {
      ...basePayload,
      check_run: {
        ...basePayload.check_run,
        status: 'in_progress',
        conclusion: null,
      },
    };
    const result = parseCheckRun(payload, 42, new Set());
    expect(result?.status).toBe('in_progress');
  });

  it('should handle failure conclusion', () => {
    const payload = {
      ...basePayload,
      check_run: {
        ...basePayload.check_run,
        conclusion: 'failure',
      },
    };
    const result = parseCheckRun(payload, 42, new Set());
    expect(result?.conclusion).toBe('failure');
  });

  it('should handle multiple PRs in check_run', () => {
    const payload = {
      ...basePayload,
      check_run: {
        ...basePayload.check_run,
        pull_requests: [{ number: 10 }, { number: 42 }, { number: 100 }],
      },
    };
    const result = parseCheckRun(payload, 42, new Set());
    expect(result).not.toBeNull();
  });
});
