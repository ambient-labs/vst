import { describe, it, expect } from 'vitest';
import { parseIssueComment } from './parse-issue-comment.js';

describe('parseIssueComment', () => {
  describe('PR comments', () => {
    const basePayload = {
      action: 'created',
      comment: {
        body: 'Great work!',
        user: { login: 'charlie' },
      },
      issue: {
        number: 42,
        pull_request: {}, // Presence indicates this is a PR
      },
    };

    it('should parse PR comment', () => {
      const result = parseIssueComment(basePayload, 42, new Set());
      expect(result).toEqual({
        event: 'comment',
        pr: 42,
        user: 'charlie',
        body: 'Great work!',
      });
    });

    it('should return null for non-matching PR', () => {
      const result = parseIssueComment(basePayload, 99, new Set());
      expect(result).toBeNull();
    });
  });

  describe('linked issue comments', () => {
    const basePayload = {
      action: 'created',
      comment: {
        body: 'Update on this issue',
        user: { login: 'dave' },
      },
      issue: {
        number: 15,
        // No pull_request field - this is a regular issue
      },
    };

    it('should parse comment on linked issue', () => {
      const linkedIssues = new Set([15, 20]);
      const result = parseIssueComment(basePayload, 42, linkedIssues);
      expect(result).toEqual({
        event: 'comment',
        issue: 15,
        user: 'dave',
        body: 'Update on this issue',
      });
    });

    it('should return null for non-linked issue', () => {
      const linkedIssues = new Set([20, 30]);
      const result = parseIssueComment(basePayload, 42, linkedIssues);
      expect(result).toBeNull();
    });
  });

  it('should return null for non-created action', () => {
    const payload = {
      action: 'deleted',
      comment: { body: 'test', user: { login: 'user' } },
      issue: { number: 42, pull_request: {} },
    };
    const result = parseIssueComment(payload, 42, new Set());
    expect(result).toBeNull();
  });
});
