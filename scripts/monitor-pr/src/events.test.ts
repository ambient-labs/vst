import { describe, it, expect } from 'vitest';
import {
  parseCheckRun,
  parseCheckSuite,
  parseReview,
  parseReviewComment,
  parseIssueComment,
  parseWebhookEvent,
} from './events/index.js';

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

describe('parseReview', () => {
  const basePayload = {
    action: 'submitted',
    review: {
      state: 'approved',
      user: { login: 'alice' },
    },
    pull_request: {
      number: 42,
    },
  };

  it('should parse approved review', () => {
    const result = parseReview(basePayload, 42, new Set());
    expect(result).toEqual({
      event: 'review',
      pr: 42,
      user: 'alice',
      action: 'approved',
    });
  });

  it('should parse changes_requested review', () => {
    const payload = {
      ...basePayload,
      review: { ...basePayload.review, state: 'changes_requested' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('changes_requested');
  });

  it('should parse commented review', () => {
    const payload = {
      ...basePayload,
      review: { ...basePayload.review, state: 'commented' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('commented');
  });

  it('should parse dismissed review', () => {
    const payload = {
      ...basePayload,
      action: 'dismissed',
      review: { ...basePayload.review, state: 'approved' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('dismissed');
  });

  it('should return null for non-matching PR', () => {
    const result = parseReview(basePayload, 99, new Set());
    expect(result).toBeNull();
  });

  it('should return null for non-submitted action', () => {
    const payload = { ...basePayload, action: 'edited' };
    const result = parseReview(payload, 42, new Set());
    expect(result).toBeNull();
  });
});

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
