import { describe, it, expect } from 'vitest';
import { parseWebhookEvent } from './parse-webhook-event.js';

describe('parseWebhookEvent', () => {
  it('should dispatch to parseCheckRun', () => {
    const payload = {
      action: 'completed',
      check_run: {
        name: 'build',
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 42 }],
      },
    };
    const result = parseWebhookEvent('check_run', payload, 42, new Set());
    expect(result?.event).toBe('ci');
  });

  it('should dispatch to parseCheckSuite', () => {
    const payload = {
      action: 'completed',
      check_suite: {
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 42 }],
      },
    };
    const result = parseWebhookEvent('check_suite', payload, 42, new Set());
    expect(result?.event).toBe('ci');
  });

  it('should dispatch to parseReview', () => {
    const payload = {
      action: 'submitted',
      review: { state: 'approved', user: { login: 'user' } },
      pull_request: { number: 42 },
    };
    const result = parseWebhookEvent('pull_request_review', payload, 42, new Set());
    expect(result?.event).toBe('review');
  });

  it('should dispatch to parseReviewComment', () => {
    const payload = {
      action: 'created',
      comment: { body: 'test', user: { login: 'user' } },
      pull_request: { number: 42 },
    };
    const result = parseWebhookEvent('pull_request_review_comment', payload, 42, new Set());
    expect(result?.event).toBe('comment');
  });

  it('should dispatch to parseIssueComment', () => {
    const payload = {
      action: 'created',
      comment: { body: 'test', user: { login: 'user' } },
      issue: { number: 42, pull_request: {} },
    };
    const result = parseWebhookEvent('issue_comment', payload, 42, new Set());
    expect(result?.event).toBe('comment');
  });

  it('should return null for unknown event type', () => {
    const result = parseWebhookEvent('unknown_event', {}, 42, new Set());
    expect(result).toBeNull();
  });
});
