// Webhook event parsing for monitor-pr
// Transforms GitHub webhook payloads into simplified JSON events

/**
 * Simplified event types output by monitor-pr
 */
export interface CIEvent {
  event: 'ci';
  check: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral' | 'timed_out' | 'action_required' | null;
}

export interface ReviewEvent {
  event: 'review';
  pr: number;
  user: string;
  action: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
}

export interface CommentEvent {
  event: 'comment';
  pr?: number;
  issue?: number;
  user: string;
  body: string;
}

export type MonitorEvent = CIEvent | ReviewEvent | CommentEvent;

/**
 * GitHub webhook payload types (partial definitions for what we need)
 */
interface CheckRunPayload {
  action: string;
  check_run: {
    name: string;
    status: string;
    conclusion: string | null;
    pull_requests: Array<{ number: number }>;
  };
}

interface CheckSuitePayload {
  action: string;
  check_suite: {
    status: string;
    conclusion: string | null;
    pull_requests: Array<{ number: number }>;
  };
}

interface PullRequestReviewPayload {
  action: string;
  review: {
    state: string;
    user: { login: string };
  };
  pull_request: {
    number: number;
  };
}

interface PullRequestReviewCommentPayload {
  action: string;
  comment: {
    body: string;
    user: { login: string };
  };
  pull_request: {
    number: number;
  };
}

interface IssueCommentPayload {
  action: string;
  comment: {
    body: string;
    user: { login: string };
  };
  issue: {
    number: number;
    pull_request?: object; // Present if this is a PR
  };
}

/**
 * Parse a check_run webhook payload into a CI event.
 */
export function parseCheckRun(
  payload: CheckRunPayload,
  targetPR: number,
  _linkedIssues: Set<number>
): CIEvent | null {
  // Filter by PR number - check if this check_run is for our PR
  const prNumbers = payload.check_run.pull_requests.map(pr => pr.number);
  if (!prNumbers.includes(targetPR)) {
    return null;
  }

  return {
    event: 'ci',
    check: payload.check_run.name,
    status: normalizeStatus(payload.check_run.status),
    conclusion: normalizeConclusion(payload.check_run.conclusion),
  };
}

/**
 * Parse a check_suite webhook payload into a CI event.
 */
export function parseCheckSuite(
  payload: CheckSuitePayload,
  targetPR: number,
  _linkedIssues: Set<number> // Unused but kept for consistent API
): CIEvent | null {
  // Filter by PR number
  const prNumbers = payload.check_suite.pull_requests.map(pr => pr.number);
  if (!prNumbers.includes(targetPR)) {
    return null;
  }

  return {
    event: 'ci',
    check: 'check_suite',
    status: normalizeStatus(payload.check_suite.status),
    conclusion: normalizeConclusion(payload.check_suite.conclusion),
  };
}

/**
 * Parse a pull_request_review webhook payload into a review event.
 */
export function parseReview(
  payload: PullRequestReviewPayload,
  targetPR: number,
  _linkedIssues: Set<number>
): ReviewEvent | null {
  // Filter by PR number
  if (payload.pull_request.number !== targetPR) {
    return null;
  }

  // Only emit for submitted reviews
  if (payload.action !== 'submitted' && payload.action !== 'dismissed') {
    return null;
  }

  return {
    event: 'review',
    pr: payload.pull_request.number,
    user: payload.review.user.login,
    action: normalizeReviewState(payload.review.state, payload.action),
  };
}

/**
 * Parse a pull_request_review_comment webhook payload into a comment event.
 */
export function parseReviewComment(
  payload: PullRequestReviewCommentPayload,
  targetPR: number,
  _linkedIssues: Set<number>
): CommentEvent | null {
  // Filter by PR number
  if (payload.pull_request.number !== targetPR) {
    return null;
  }

  // Only emit for created comments
  if (payload.action !== 'created') {
    return null;
  }

  return {
    event: 'comment',
    pr: payload.pull_request.number,
    user: payload.comment.user.login,
    body: payload.comment.body,
  };
}

/**
 * Parse an issue_comment webhook payload into a comment event.
 * Handles both PR comments and linked issue comments.
 */
export function parseIssueComment(
  payload: IssueCommentPayload,
  targetPR: number,
  linkedIssues: Set<number>
): CommentEvent | null {
  // Only emit for created comments
  if (payload.action !== 'created') {
    return null;
  }

  const issueNum = payload.issue.number;
  const isPR = payload.issue.pull_request !== undefined;

  // Check if this is our target PR
  if (isPR && issueNum === targetPR) {
    return {
      event: 'comment',
      pr: issueNum,
      user: payload.comment.user.login,
      body: payload.comment.body,
    };
  }

  // Check if this is a linked issue
  if (!isPR && linkedIssues.has(issueNum)) {
    return {
      event: 'comment',
      issue: issueNum,
      user: payload.comment.user.login,
      body: payload.comment.body,
    };
  }

  return null;
}

/**
 * Main entry point: parse any webhook payload into a MonitorEvent.
 */
export function parseWebhookEvent(
  eventType: string,
  payload: unknown,
  targetPR: number,
  linkedIssues: Set<number>
): MonitorEvent | null {
  switch (eventType) {
    case 'check_run':
      return parseCheckRun(payload as CheckRunPayload, targetPR, linkedIssues);
    case 'check_suite':
      return parseCheckSuite(payload as CheckSuitePayload, targetPR, linkedIssues);
    case 'pull_request_review':
      return parseReview(payload as PullRequestReviewPayload, targetPR, linkedIssues);
    case 'pull_request_review_comment':
      return parseReviewComment(payload as PullRequestReviewCommentPayload, targetPR, linkedIssues);
    case 'issue_comment':
      return parseIssueComment(payload as IssueCommentPayload, targetPR, linkedIssues);
    default:
      return null;
  }
}

// Helper functions for normalization

function normalizeStatus(status: string): CIEvent['status'] {
  switch (status.toLowerCase()) {
    case 'queued':
      return 'queued';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'in_progress';
  }
}

function normalizeConclusion(conclusion: string | null): CIEvent['conclusion'] {
  if (!conclusion) return null;
  switch (conclusion.toLowerCase()) {
    case 'success':
      return 'success';
    case 'failure':
      return 'failure';
    case 'cancelled':
      return 'cancelled';
    case 'skipped':
      return 'skipped';
    case 'neutral':
      return 'neutral';
    case 'timed_out':
      return 'timed_out';
    case 'action_required':
      return 'action_required';
    default:
      return null;
  }
}

function normalizeReviewState(state: string, action: string): ReviewEvent['action'] {
  if (action === 'dismissed') {
    return 'dismissed';
  }
  switch (state.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'changes_requested':
      return 'changes_requested';
    case 'commented':
    default:
      return 'commented';
  }
}
