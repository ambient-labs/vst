// Recursive issue discovery via BFS traversal

import type { IssueFetcher } from '../types.js';
import { parseIssueLinks } from './parse-issue-links.js';

/**
 * Recursively discover all linked issues starting from a PR.
 * Performs BFS traversal of issue links up to maxDepth levels.
 *
 * @param prBody - The PR body text to start from
 * @param fetchIssue - Function to fetch issue body by number
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param maxDepth - Maximum recursion depth (default: 3)
 * @returns Set of all discovered issue numbers
 */
export async function discoverLinkedIssues(
  prBody: string,
  fetchIssue: IssueFetcher,
  owner: string,
  repo: string,
  maxDepth: number = 3
): Promise<Set<number>> {
  const allIssues = new Set<number>();
  const visited = new Set<number>();
  const queue: Array<{ issues: Set<number>; depth: number }> = [];

  // Start with issues from PR body
  const initialIssues = parseIssueLinks(prBody);
  if (initialIssues.size > 0) {
    queue.push({ issues: initialIssues, depth: 0 });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const issueNum of current.issues) {
      if (visited.has(issueNum)) {
        continue;
      }
      visited.add(issueNum);
      allIssues.add(issueNum);

      // Only recurse if we haven't hit max depth
      if (current.depth < maxDepth) {
        try {
          const issueBody = await fetchIssue(owner, repo, issueNum);
          if (issueBody) {
            const linkedIssues = parseIssueLinks(issueBody);
            if (linkedIssues.size > 0) {
              queue.push({ issues: linkedIssues, depth: current.depth + 1 });
            }
          }
        } catch {
          // Issue fetch failed, skip but continue with others
        }
      }
    }
  }

  return allIssues;
}
