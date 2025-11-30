// monitor-pr: Real-time GitHub PR monitoring via webhooks
// Main module that orchestrates issue discovery, server, and webhook forwarding

import { discoverLinkedIssues } from './issues/index.js';
import { createWebhookServer, startServer, stopServer } from './server/index.js';
import {
  fetchPR,
  createGhIssueFetcher,
  generateSecret,
  startWebhookForward,
} from './cli/index.js';
import type { MonitorEvent } from './types.js';

// Re-export from issues module
export { parseIssueLinks, discoverLinkedIssues } from './issues/index.js';

// Re-export from events module
export { parseWebhookEvent } from './events/index.js';

// Re-export types
export type {
  MonitorEvent,
  CIEvent,
  ReviewEvent,
  CommentEvent,
  EventType,
  EventPayloadMap,
  IssueFetcher,
  WebhookServerOptions,
  MonitorConfig,
} from './types.js';
export { isEventType, eventTypes } from './types.js';

// Re-export from server module
export { createWebhookServer, startServer, stopServer, verifySignature } from './server/index.js';

// Re-export CLI utilities
export { fetchPR, createGhIssueFetcher, generateSecret, startWebhookForward } from './cli/index.js';

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
