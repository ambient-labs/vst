// Parse check_run webhook payloads

import type { CheckRunPayload, CIEvent } from '../types.js';

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

  const status = payload.check_run.status.toLowerCase() as CIEvent['status'];
  const conclusion = payload.check_run.conclusion?.toLowerCase() as CIEvent['conclusion'] ?? null;

  return {
    event: 'ci',
    check: payload.check_run.name,
    status,
    conclusion,
  };
}
