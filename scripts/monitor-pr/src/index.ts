// monitor-pr: Real-time GitHub PR monitoring via webhooks
// Main module that orchestrates issue discovery, server, and webhook forwarding

import { spawn, ChildProcess } from 'node:child_process';
import { discoverLinkedIssues, IssueFetcher } from './issues.js';
import { createWebhookServer, startServer, stopServer } from './server.js';
import { MonitorEvent } from './events.js';

export { parseIssueLinks, discoverLinkedIssues } from './issues.js';
export { parseWebhookEvent } from './events.js';
export type { MonitorEvent, CIEvent, ReviewEvent, CommentEvent } from './events.js';
export { createWebhookServer, startServer, stopServer, verifySignature } from './server.js';

/**
 * Configuration for the monitor-pr CLI
 */
export interface MonitorConfig {
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** PR number to monitor */
  prNumber: number;
  /** Webhook secret (generated if not provided) */
  secret?: string;
  /** Maximum depth for issue discovery (default: 3) */
  maxDepth?: number;
}

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
      '--jq', '.body, .state'
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

/**
 * Create an issue fetcher that uses gh CLI
 */
export function createGhIssueFetcher(): IssueFetcher {
  return async (owner: string, repo: string, issueNumber: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const child = spawn('gh', [
        'api',
        `repos/${owner}/${repo}/issues/${issueNumber}`,
        '--jq', '.body'
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

/**
 * Generate a random webhook secret
 */
export function generateSecret(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Start gh webhook forward subprocess
 */
export function startWebhookForward(
  owner: string,
  repo: string,
  port: number,
  secret: string,
  events: string[]
): ChildProcess {
  const args = [
    'webhook',
    'forward',
    '--repo', `${owner}/${repo}`,
    '--events', events.join(','),
    '--url', `http://127.0.0.1:${port}/`,
    '--secret', secret,
  ];

  const child = spawn('gh', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return child;
}

/**
 * Main entry point for monitor-pr CLI
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  // Parse arguments
  if (args.length < 1) {
    console.error('Usage: monitor-pr <pr-number> [--repo owner/repo]');
    process.exit(1);
  }

  const prNumber = parseInt(args[0], 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error('Error: Invalid PR number');
    process.exit(1);
  }

  // Parse optional --repo argument
  let owner = 'ambient-labs';
  let repo = 'vst';
  const repoIdx = args.indexOf('--repo');
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    const parts = args[repoIdx + 1].split('/');
    if (parts.length === 2) {
      owner = parts[0];
      repo = parts[1];
    }
  }

  console.error(`Monitoring PR #${prNumber} in ${owner}/${repo}...`);

  // Fetch PR details
  let prBody: string;
  try {
    const pr = await fetchPR(owner, repo, prNumber);
    prBody = pr.body;
    console.error(`PR state: ${pr.state}`);
  } catch (err) {
    console.error(`Failed to fetch PR: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // Discover linked issues
  const issueFetcher = createGhIssueFetcher();
  const linkedIssues = await discoverLinkedIssues(prBody, issueFetcher, owner, repo);
  console.error(`Found ${linkedIssues.size} linked issues: ${[...linkedIssues].join(', ') || 'none'}`);

  // Generate webhook secret
  const secret = generateSecret();

  // Create and start HTTP server
  const server = createWebhookServer({
    targetPR: prNumber,
    linkedIssues,
    secret,
    onEvent: (event: MonitorEvent) => {
      // Output event as JSON to stdout
      console.log(JSON.stringify(event));
    },
    onError: (error: Error) => {
      console.error(`Server error: ${error.message}`);
    },
  });

  const port = await startServer(server);
  console.error(`Webhook server listening on port ${port}`);

  // Start gh webhook forward
  const events = [
    'check_run',
    'check_suite',
    'pull_request_review',
    'pull_request_review_comment',
    'issue_comment',
  ];

  console.error(`Starting webhook forwarder for events: ${events.join(', ')}`);
  const forwarder = startWebhookForward(owner, repo, port, secret, events);

  // Forward stderr from gh webhook (status messages)
  forwarder.stderr?.on('data', (data: Buffer) => {
    console.error(`[gh webhook] ${data.toString().trim()}`);
  });

  forwarder.on('error', (err) => {
    console.error(`Failed to start webhook forwarder: ${err.message}`);
    process.exit(1);
  });

  forwarder.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Webhook forwarder exited with code ${code}`);
    }
  });

  // Handle graceful shutdown
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.error('\nShutting down...');

    // Kill the forwarder
    forwarder.kill('SIGTERM');

    // Stop the server
    await stopServer(server);

    console.error('Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.error('Ready! Streaming events to stdout...');
}
