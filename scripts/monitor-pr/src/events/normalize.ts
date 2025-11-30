// Normalization helpers for webhook payloads

import type { CIEvent, ReviewEvent } from '../types.js';

/**
 * Normalize check status values
 */
export function normalizeStatus(status: string): CIEvent['status'] {
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

/**
 * Normalize check conclusion values
 */
export function normalizeConclusion(conclusion: string | null): CIEvent['conclusion'] {
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

/**
 * Normalize review state values
 */
export function normalizeReviewState(state: string, action: string): ReviewEvent['action'] {
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
