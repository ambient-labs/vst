import { describe, it, expect, vi } from 'vitest';
import { discoverLinkedIssues } from './discover-linked-issues.js';
import type { IssueFetcher } from '../types.js';

describe('discoverLinkedIssues', () => {
  it('should discover direct links from PR body', async () => {
    const mockFetcher: IssueFetcher = vi.fn().mockResolvedValue(null);

    const result = await discoverLinkedIssues(
      'Fixes #42, Part of #100',
      mockFetcher,
      'owner',
      'repo'
    );

    expect(result).toEqual(new Set([42, 100]));
  });

  it('should recursively discover linked issues', async () => {
    const mockFetcher: IssueFetcher = vi.fn()
      .mockResolvedValueOnce('Depends on #200') // Issue #42 body
      .mockResolvedValueOnce(null) // Issue #100 body
      .mockResolvedValueOnce(null); // Issue #200 body

    const result = await discoverLinkedIssues(
      'Fixes #42, Part of #100',
      mockFetcher,
      'owner',
      'repo'
    );

    expect(result).toEqual(new Set([42, 100, 200]));
    expect(mockFetcher).toHaveBeenCalledWith('owner', 'repo', 42);
    expect(mockFetcher).toHaveBeenCalledWith('owner', 'repo', 100);
    expect(mockFetcher).toHaveBeenCalledWith('owner', 'repo', 200);
  });

  it('should respect maxDepth', async () => {
    // Create a chain: 1 -> 2 -> 3 -> 4 -> 5
    const mockFetcher: IssueFetcher = vi.fn()
      .mockImplementation(async (_o, _r, num) => {
        if (num < 5) {
          return `Depends on #${num + 1}`;
        }
        return null;
      });

    const result = await discoverLinkedIssues(
      'Fixes #1',
      mockFetcher,
      'owner',
      'repo',
      2 // Only go 2 levels deep
    );

    // Should find 1, 2, 3 but not 4 or 5
    expect(result).toEqual(new Set([1, 2, 3]));
  });

  it('should handle cycles without infinite loop', async () => {
    // Create a cycle: 1 -> 2 -> 1
    const mockFetcher: IssueFetcher = vi.fn()
      .mockImplementation(async (_o, _r, num) => {
        if (num === 1) return 'Depends on #2';
        if (num === 2) return 'Depends on #1';
        return null;
      });

    const result = await discoverLinkedIssues(
      'Fixes #1',
      mockFetcher,
      'owner',
      'repo'
    );

    expect(result).toEqual(new Set([1, 2]));
  });

  it('should handle fetch errors gracefully', async () => {
    const mockFetcher: IssueFetcher = vi.fn()
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(null);

    const result = await discoverLinkedIssues(
      'Fixes #1, Fixes #2',
      mockFetcher,
      'owner',
      'repo'
    );

    // Should still include both issues even though #1 fetch failed
    expect(result).toEqual(new Set([1, 2]));
  });

  it('should handle empty PR body', async () => {
    const mockFetcher: IssueFetcher = vi.fn();

    const result = await discoverLinkedIssues(
      '',
      mockFetcher,
      'owner',
      'repo'
    );

    expect(result).toEqual(new Set());
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
