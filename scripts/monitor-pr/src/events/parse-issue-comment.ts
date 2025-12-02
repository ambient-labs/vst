// Parse issue_comment webhook payloads

import type { IssueCommentPayload, CommentEvent } from '../types.js';

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
