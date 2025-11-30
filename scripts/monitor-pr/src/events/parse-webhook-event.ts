// Main webhook event dispatcher

import type { MonitorEvent, EventType } from '../types.js';
import { isEventType } from '../types.js';
import { parseCheckRun } from './parse-check-run.js';
import { parseCheckSuite } from './parse-check-suite.js';
import { parseReview } from './parse-review.js';
import { parseReviewComment } from './parse-review-comment.js';
import { parseIssueComment } from './parse-issue-comment.js';

type ParserFn = (
  payload: unknown,
  targetPR: number,
  linkedIssues: Set<number>
) => MonitorEvent | null;

/**
 * Registry of event parsers keyed by event type
 */
const eventParsers: Record<EventType, ParserFn> = {
  check_run: parseCheckRun as ParserFn,
  check_suite: parseCheckSuite as ParserFn,
  pull_request_review: parseReview as ParserFn,
  pull_request_review_comment: parseReviewComment as ParserFn,
  issue_comment: parseIssueComment as ParserFn,
};

/**
 * Main entry point: parse any webhook payload into a MonitorEvent.
 */
export function parseWebhookEvent(
  eventType: string,
  payload: unknown,
  targetPR: number,
  linkedIssues: Set<number>
): MonitorEvent | null {
  if (!isEventType(eventType)) {
    return null;
  }

  const parser = eventParsers[eventType];
  return parser(payload, targetPR, linkedIssues);
}
