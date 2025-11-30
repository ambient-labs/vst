// Parse check_run webhook payloads

import type { CheckRunPayload, CIEvent } from '../types.js';
import { normalizeStatus, normalizeConclusion } from './normalize.js';

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
