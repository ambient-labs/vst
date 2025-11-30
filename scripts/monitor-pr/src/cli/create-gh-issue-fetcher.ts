// Create an issue fetcher that uses gh CLI

import { spawn } from 'node:child_process';
import type { IssueFetcher } from '../types.js';

/**
 * Create an issue fetcher that uses gh CLI
 */
export function createGhIssueFetcher(): IssueFetcher {
  return async (owner: string, repo: string, issueNumber: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const child = spawn('gh', [
        'api',
        `repos/${owner}/${repo}/issues/${issueNumber}`,
        '--jq',
        '.body',
      ]);

      let stdout = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          resolve(null);
        } else {
          resolve(stdout.trim() || null);
        }
      });
    });
  };
}
