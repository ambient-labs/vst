import { describe, it, expect } from 'vitest';
import { parseIssueLinks } from './parse-issue-links.js';

describe('parseIssueLinks', () => {
  describe('closing keywords', () => {
    it('should parse "Fixes #X"', () => {
      const result = parseIssueLinks('Fixes #42');
      expect(result).toEqual(new Set([42]));
    });

    it('should parse "fixes #X" (case insensitive)', () => {
      const result = parseIssueLinks('fixes #123');
      expect(result).toEqual(new Set([123]));
    });

    it('should parse "Closes #X"', () => {
      const result = parseIssueLinks('Closes #15');
      expect(result).toEqual(new Set([15]));
    });

    it('should parse "Resolves #X"', () => {
      const result = parseIssueLinks('Resolves #99');
      expect(result).toEqual(new Set([99]));
    });

    it('should parse "Fixed #X"', () => {
      const result = parseIssueLinks('Fixed #7');
      expect(result).toEqual(new Set([7]));
    });
  });

  describe('dependency keywords', () => {
    it('should parse "Depends on #X"', () => {
      const result = parseIssueLinks('Depends on #50');
      expect(result).toEqual(new Set([50]));
    });

    it('should parse "Blocked by #X"', () => {
      const result = parseIssueLinks('Blocked by #33');
      expect(result).toEqual(new Set([33]));
    });

    it('should parse "Requires #X"', () => {
      const result = parseIssueLinks('Requires #21');
      expect(result).toEqual(new Set([21]));
    });

    it('should parse "After #X"', () => {
      const result = parseIssueLinks('After #88');
      expect(result).toEqual(new Set([88]));
    });
  });

  describe('hierarchical keywords', () => {
    it('should parse "Part of #X"', () => {
      const result = parseIssueLinks('Part of #100');
      expect(result).toEqual(new Set([100]));
    });

    it('should parse "Sub-issue of #X"', () => {
      const result = parseIssueLinks('Sub-issue of #45');
      expect(result).toEqual(new Set([45]));
    });

    it('should parse "Subissue of #X"', () => {
      const result = parseIssueLinks('Subissue of #45');
      expect(result).toEqual(new Set([45]));
    });

    it('should parse "Parent #X"', () => {
      const result = parseIssueLinks('Parent #12');
      expect(result).toEqual(new Set([12]));
    });
  });

  describe('reference keywords', () => {
    it('should parse "Related to #X"', () => {
      const result = parseIssueLinks('Related to #77');
      expect(result).toEqual(new Set([77]));
    });

    it('should parse "See #X"', () => {
      const result = parseIssueLinks('See #5');
      expect(result).toEqual(new Set([5]));
    });

    it('should parse "Ref #X"', () => {
      const result = parseIssueLinks('Ref #19');
      expect(result).toEqual(new Set([19]));
    });
  });

  describe('plain issue mentions', () => {
    it('should parse standalone #X', () => {
      const result = parseIssueLinks('Working on #42');
      expect(result).toEqual(new Set([42]));
    });

    it('should parse #X at start of line', () => {
      const result = parseIssueLinks('#42 is important');
      expect(result).toEqual(new Set([42]));
    });

    it('should parse multiple mentions', () => {
      const result = parseIssueLinks('See #1, #2, and #3');
      expect(result).toEqual(new Set([1, 2, 3]));
    });
  });

  describe('complex bodies', () => {
    it('should parse multiple issue references in a PR body', () => {
      const body = `
## Summary
Implements feature X

Fixes #42

## Dependencies
- Depends on #100
- Blocked by #50

## Related
See #10 for context
Part of #92
      `;
      const result = parseIssueLinks(body);
      expect(result).toEqual(new Set([42, 100, 50, 10, 92]));
    });

    it('should deduplicate repeated references', () => {
      const body = 'Fixes #42. See also #42 and #42.';
      const result = parseIssueLinks(body);
      expect(result).toEqual(new Set([42]));
    });

    it('should return empty set for body with no issues', () => {
      const result = parseIssueLinks('This PR adds a new feature.');
      expect(result).toEqual(new Set());
    });

    it('should handle empty body', () => {
      const result = parseIssueLinks('');
      expect(result).toEqual(new Set());
    });
  });
});
