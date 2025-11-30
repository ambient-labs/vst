// Parse pull_request_review webhook payloads

import type { PullRequestReviewPayload, ReviewEvent } from '../types.js';
import { normalizeReviewState } from './normalize.js';

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
