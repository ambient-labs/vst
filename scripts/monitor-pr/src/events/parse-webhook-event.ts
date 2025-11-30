// Main webhook event dispatcher

import type {
  MonitorEvent,
  CheckRunPayload,
  CheckSuitePayload,
  PullRequestReviewPayload,
  PullRequestReviewCommentPayload,
  IssueCommentPayload,
} from '../types.js';
import { parseCheckRun } from './parse-check-run.js';
import { parseCheckSuite } from './parse-check-suite.js';
import { parseReview } from './parse-review.js';
import { parseReviewComment } from './parse-review-comment.js';
import { parseIssueComment } from './parse-issue-comment.js';

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
