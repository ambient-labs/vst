// Parse pull_request_review_comment webhook payloads

import type { PullRequestReviewCommentPayload, CommentEvent } from '../types.js';

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
