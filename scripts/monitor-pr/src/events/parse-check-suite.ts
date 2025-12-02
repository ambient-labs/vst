// Parse check_suite webhook payloads

import type { CheckSuitePayload, CIEvent } from '../types.js';

/**
 * Parse a check_suite webhook payload into a CI event.
 */
export function parseCheckSuite(
  payload: CheckSuitePayload,
  targetPR: number,
  _linkedIssues: Set<number>
): CIEvent | null {
  // Filter by PR number
  const prNumbers = payload.check_suite.pull_requests.map(pr => pr.number);
  if (!prNumbers.includes(targetPR)) {
    return null;
  }

  const status = payload.check_suite.status.toLowerCase() as CIEvent['status'];
  const conclusion = payload.check_suite.conclusion?.toLowerCase() as CIEvent['conclusion'] ?? null;

  return {
    event: 'ci',
    check: 'check_suite',
    status,
    conclusion,
  };
}
