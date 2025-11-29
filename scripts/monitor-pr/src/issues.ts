// Issue link parsing utilities for monitor-pr
// Extracts issue references from PR bodies and recursively discovers linked issues

/**
 * Patterns that indicate issue relationships:
 * - Fixes #X, Closes #X, Resolves #X (closing keywords)
 * - Depends on #X, Blocked by #X (dependencies)
 * - Part of #X, Sub-issue of #X, Parent #X (hierarchical)
 * - Related to #X, See #X, Ref #X (references)
 * - Direct #X mentions
 */
const ISSUE_PATTERNS = [
  // Closing keywords (GitHub auto-close)
  /(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?)\s+#(\d+)/gi,
  // Dependency keywords
  /(?:depends?\s+on|blocked?\s+by|requires?|after)\s+#(\d+)/gi,
  // Hierarchical relationships
  /(?:part\s+of|sub-?issue\s+of|parent|child\s+of)\s+#(\d+)/gi,
  // Reference keywords
  /(?:related?\s+to|see|ref(?:erence)?s?|links?\s+to)\s+#(\d+)/gi,
  // Plain issue mentions (standalone #X not part of other patterns)
  /(?:^|[^\w])#(\d+)(?=[^\d]|$)/gm,
];

/**
 * Extract all issue numbers from a text body.
 * Returns a unique set of issue numbers.
 */
export function parseIssueLinks(body: string): Set<number> {
  const issues = new Set<number>();

  for (const pattern of ISSUE_PATTERNS) {
    // Reset lastIndex since we reuse regex objects
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      const issueNum = parseInt(match[1], 10);
      if (!isNaN(issueNum) && issueNum > 0) {
        issues.add(issueNum);
      }
    }
  }

  return issues;
}

/**
 * GitHub API types for issue/PR fetching
 */
export interface GitHubIssue {
  number: number;
  body: string | null;
  state: string;
}

export interface GitHubPR {
  number: number;
  body: string | null;
  state: string;
  base: {
    repo: {
      owner: { login: string };
      name: string;
    };
  };
}

/**
 * Function type for fetching issue bodies from GitHub.
 * This allows injection of the actual GitHub API call or mocks for testing.
 */
export type IssueFetcher = (
  owner: string,
  repo: string,
  issueNumber: number
) => Promise<string | null>;

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
