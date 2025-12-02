import { describe, it, expect } from 'vitest';
import { parseCheckSuite } from './parse-check-suite.js';

describe('parseCheckSuite', () => {
  const basePayload = {
    action: 'completed',
    check_suite: {
      status: 'completed',
      conclusion: 'success',
      pull_requests: [{ number: 42 }],
    },
  };

  it('should parse check_suite for matching PR', () => {
    const result = parseCheckSuite(basePayload, 42, new Set());
    expect(result).toEqual({
      event: 'ci',
      check: 'check_suite',
      status: 'completed',
      conclusion: 'success',
    });
  });

  it('should return null for non-matching PR', () => {
    const result = parseCheckSuite(basePayload, 99, new Set());
    expect(result).toBeNull();
  });
});
