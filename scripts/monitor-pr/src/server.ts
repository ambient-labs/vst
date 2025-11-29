// HTTP webhook server for monitor-pr
// Receives GitHub webhook POSTs, verifies signatures, emits events

import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseWebhookEvent, MonitorEvent } from './events.js';

/**
 * Options for creating the webhook server
 */
export interface WebhookServerOptions {
  /** Target PR number to filter events for */
  targetPR: number;
  /** Set of linked issue numbers to also monitor */
  linkedIssues: Set<number>;
  /** Webhook secret for signature verification (optional but recommended) */
  secret?: string;
  /** Callback for each parsed event */
  onEvent: (event: MonitorEvent) => void;
  /** Callback for errors (optional) */
  onError?: (error: Error) => void;
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * Returns true if signature is valid, false otherwise.
 */
export function verifySignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  // GitHub sends signature as "sha256=<hex>"
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const receivedSig = parts[1];
  const expectedSig = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}

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

/**
 * Start the server on a random available port.
 * Returns a promise that resolves with the assigned port.
 */
export function startServer(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(addr.port);
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
  });
}

/**
 * Gracefully stop the server
 */
export function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
