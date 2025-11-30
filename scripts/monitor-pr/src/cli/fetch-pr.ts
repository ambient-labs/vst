// Fetch PR details from GitHub using gh CLI

import { spawn } from 'node:child_process';

/**
 * Fetch PR details from GitHub using gh CLI
 */
export async function fetchPR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ body: string; state: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', [
      'api',
      `repos/${owner}/${repo}/pulls/${prNumber}`,
      '--jq',
      '.body, .state',
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to fetch PR: ${stderr}`));
      } else {
        const lines = stdout.trim().split('\n');
        // jq outputs body on first line(s), state on last line
        const state = lines.pop() || 'unknown';
        const body = lines.join('\n');
        resolve({ body, state });
      }
    });
  });
}
