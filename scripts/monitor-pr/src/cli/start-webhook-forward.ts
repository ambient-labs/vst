// Start gh webhook forward subprocess

import { spawn, ChildProcess } from 'node:child_process';

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
    '--repo',
    `${owner}/${repo}`,
    '--events',
    events.join(','),
    '--url',
    `http://127.0.0.1:${port}/`,
    '--secret',
    secret,
  ];

  const child = spawn('gh', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return child;
}
