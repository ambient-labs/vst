// HTTP webhook server creation

import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import { parseWebhookEvent } from '../events/index.js';
import type { WebhookServerOptions } from '../types.js';
import { verifySignature } from './verify-signature.js';

/**
 * Read full request body as a string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, status: number, data: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Create and return the webhook HTTP server.
 * Server listens on a random available port.
 */
export function createWebhookServer(options: WebhookServerOptions): Server {
  const { targetPR, linkedIssues, secret, onEvent, onError } = options;

  const server = createServer(async (req, res) => {
    // Only handle POST requests to root
    if (req.method !== 'POST' || req.url !== '/') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    try {
      const body = await readBody(req);

      // Verify signature if secret is configured
      if (secret) {
        const signature = req.headers['x-hub-signature-256'] as string | undefined;
        if (!verifySignature(body, signature, secret)) {
          sendJson(res, 401, { error: 'Invalid signature' });
          return;
        }
      }

      // Get event type from header
      const eventType = req.headers['x-github-event'] as string | undefined;
      if (!eventType) {
        sendJson(res, 400, { error: 'Missing X-GitHub-Event header' });
        return;
      }

      // Parse payload
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
        return;
      }

      // Parse into simplified event format
      const event = parseWebhookEvent(eventType, payload, targetPR, linkedIssues);

      // Emit event if it matched our filters
      if (event) {
        onEvent(event);
      }

      // Always acknowledge receipt
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  });

  return server;
}
