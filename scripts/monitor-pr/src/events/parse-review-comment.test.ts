import { describe, it, expect } from 'vitest';
import { parseReviewComment } from './parse-review-comment.js';

describe('parseReviewComment', () => {
  const basePayload = {
    action: 'created',
    comment: {
      body: 'LGTM!',
      user: { login: 'bob' },
    },
    pull_request: {
      number: 42,
    },
  };

  it('should parse review comment', () => {
    const result = parseReviewComment(basePayload, 42, new Set());
    expect(result).toEqual({
      event: 'comment',
      pr: 42,
      user: 'bob',
      body: 'LGTM!',
    });
  });

  it('should return null for non-matching PR', () => {
    const result = parseReviewComment(basePayload, 99, new Set());
    expect(result).toBeNull();
  });

  it('should return null for non-created action', () => {
    const payload = { ...basePayload, action: 'edited' };
    const result = parseReviewComment(payload, 42, new Set());
    expect(result).toBeNull();
  });
});
