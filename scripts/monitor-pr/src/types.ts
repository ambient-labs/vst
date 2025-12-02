// Type definitions for monitor-pr

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
export interface CheckRunPayload {
  action: string;
  check_run: {
    name: string;
    status: string;
    conclusion: string | null;
    pull_requests: Array<{ number: number }>;
  };
}

export interface CheckSuitePayload {
  action: string;
  check_suite: {
    status: string;
    conclusion: string | null;
    pull_requests: Array<{ number: number }>;
  };
}

export interface PullRequestReviewPayload {
  action: string;
  review: {
    state: string;
    user: { login: string };
  };
  pull_request: {
    number: number;
  };
}

export interface PullRequestReviewCommentPayload {
  action: string;
  comment: {
    body: string;
    user: { login: string };
  };
  pull_request: {
    number: number;
  };
}

export interface IssueCommentPayload {
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
 * Supported GitHub webhook event types
 */
export const eventTypes = [
  'check_run',
  'check_suite',
  'pull_request_review',
  'pull_request_review_comment',
  'issue_comment',
] as const;

export type EventType = (typeof eventTypes)[number];

/**
 * Type guard to narrow a string to a valid EventType
 */
export const isEventType = (eventType: string): eventType is EventType => {
  return (eventTypes as readonly string[]).includes(eventType);
};

/**
 * Map of event types to their payload types
 */
export type EventPayloadMap = {
  check_run: CheckRunPayload;
  check_suite: CheckSuitePayload;
  pull_request_review: PullRequestReviewPayload;
  pull_request_review_comment: PullRequestReviewCommentPayload;
  issue_comment: IssueCommentPayload;
};

/**
 * Parser function signature for webhook events
 */
export type EventParser<T extends EventType> = (
  payload: EventPayloadMap[T],
  targetPR: number,
  linkedIssues: Set<number>
) => MonitorEvent | null;

/**
 * GitHub API types for issue/PR fetching
 */
export interface GitHubIssue {
  number: number;
  body: string | null;
  state: string;
}

export interface GitHubPR {
  number: number;
  body: string | null;
  state: string;
  base: {
    repo: {
      owner: { login: string };
      name: string;
    };
  };
}

/**
 * Function type for fetching issue bodies from GitHub.
 * This allows injection of the actual GitHub API call or mocks for testing.
 */
export type IssueFetcher = (
  owner: string,
  repo: string,
  issueNumber: number
) => Promise<string | null>;

/**
 * Options for creating the webhook server
 */
export interface WebhookServerOptions {
  /** Target PR number to filter events for */
  targetPR: number;
  /** Set of linked issue numbers to also monitor */
  linkedIssues: Set<number>;
  /** Webhook secret for signature verification (optional but recommended) */
  secret?: string;
  /** Callback for each parsed event */
  onEvent: (event: MonitorEvent) => void;
  /** Callback for errors (optional) */
  onError?: (error: Error) => void;
}

/**
 * Configuration for the monitor-pr CLI
 */
export interface MonitorConfig {
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** PR number to monitor */
  prNumber: number;
  /** Webhook secret (generated if not provided) */
  secret?: string;
  /** Maximum depth for issue discovery (default: 3) */
  maxDepth?: number;
}
