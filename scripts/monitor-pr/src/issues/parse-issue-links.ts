// Issue link parsing from text bodies

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
