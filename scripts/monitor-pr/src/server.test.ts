import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verifySignature,
  createWebhookServer,
  startServer,
  stopServer,
} from './server.js';
import type { MonitorEvent } from './types.js';
import type { Server } from 'node:http';

describe('verifySignature', () => {
  const secret = 'test-secret';
  const payload = '{"test": "data"}';

  function createSignature(body: string, key: string): string {
    const sig = createHmac('sha256', key).update(body).digest('hex');
    return `sha256=${sig}`;
  }

  it('should return true for valid signature', () => {
    const signature = createSignature(payload, secret);
    expect(verifySignature(payload, signature, secret)).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const signature = createSignature(payload, 'wrong-secret');
    expect(verifySignature(payload, signature, secret)).toBe(false);
  });

  it('should return false for missing signature', () => {
    expect(verifySignature(payload, undefined, secret)).toBe(false);
  });

  it('should return false for malformed signature', () => {
    expect(verifySignature(payload, 'invalid', secret)).toBe(false);
    expect(verifySignature(payload, 'md5=abc', secret)).toBe(false);
    expect(verifySignature(payload, 'sha256=', secret)).toBe(false);
  });

  it('should return false for invalid hex in signature', () => {
    expect(verifySignature(payload, 'sha256=notvalidhex!@#', secret)).toBe(false);
  });
});

describe('createWebhookServer', () => {
  let server: Server;
  let port: number;
  const secret = 'test-secret';
  const targetPR = 42;
  const linkedIssues = new Set([10, 20]);

  function createSignature(body: string): string {
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    return `sha256=${sig}`;
  }

  async function sendRequest(
    body: string,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; body: object }> {
    const response = await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });
    const responseBody = await response.json() as object;
    return { status: response.status, body: responseBody };
  }

  beforeEach(async () => {
    // Event handler mock
    const onEvent = vi.fn();
    const onError = vi.fn();

    server = createWebhookServer({
      targetPR,
      linkedIssues,
      secret,
      onEvent,
      onError,
    });

    port = await startServer(server);
  });

  afterEach(async () => {
    await stopServer(server);
  });

  it('should return 404 for non-root paths', async () => {
    const response = await globalThis.fetch(`http://127.0.0.1:${port}/other`);
    expect(response.status).toBe(404);
  });

  it('should return 404 for GET requests', async () => {
    const response = await globalThis.fetch(`http://127.0.0.1:${port}/`);
    expect(response.status).toBe(404);
  });

  it('should return 401 for invalid signature', async () => {
    const body = JSON.stringify({ test: 'data' });
    const result = await sendRequest(body, {
      'X-GitHub-Event': 'check_run',
      'X-Hub-Signature-256': 'sha256=invalid',
    });
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Invalid signature' });
  });

  it('should return 400 for missing event header', async () => {
    const body = JSON.stringify({ test: 'data' });
    const result = await sendRequest(body, {
      'X-Hub-Signature-256': createSignature(body),
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'Missing X-GitHub-Event header' });
  });

  it('should return 400 for invalid JSON', async () => {
    const body = 'not json';
    const result = await sendRequest(body, {
      'X-GitHub-Event': 'check_run',
      'X-Hub-Signature-256': createSignature(body),
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'Invalid JSON payload' });
  });

  it('should return 200 for valid webhook', async () => {
    const payload = {
      action: 'completed',
      check_run: {
        name: 'test',
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 42 }],
      },
    };
    const body = JSON.stringify(payload);
    const result = await sendRequest(body, {
      'X-GitHub-Event': 'check_run',
      'X-Hub-Signature-256': createSignature(body),
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });
});

describe('createWebhookServer event emission', () => {
  let server: Server;
  let port: number;
  let events: MonitorEvent[];
  const secret = 'test-secret';

  function createSignature(body: string): string {
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    return `sha256=${sig}`;
  }

  beforeEach(async () => {
    events = [];
    server = createWebhookServer({
      targetPR: 42,
      linkedIssues: new Set([15]),
      secret,
      onEvent: (event) => events.push(event),
    });
    port = await startServer(server);
  });

  afterEach(async () => {
    await stopServer(server);
  });

  it('should emit CI event for matching check_run', async () => {
    const payload = {
      action: 'completed',
      check_run: {
        name: 'build',
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 42 }],
      },
    };
    const body = JSON.stringify(payload);

    await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'check_run',
        'X-Hub-Signature-256': createSignature(body),
      },
      body,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'ci',
      check: 'build',
      status: 'completed',
      conclusion: 'success',
    });
  });

  it('should emit review event for submitted review', async () => {
    const payload = {
      action: 'submitted',
      review: {
        state: 'approved',
        user: { login: 'reviewer' },
      },
      pull_request: { number: 42 },
    };
    const body = JSON.stringify(payload);

    await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request_review',
        'X-Hub-Signature-256': createSignature(body),
      },
      body,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'review',
      pr: 42,
      user: 'reviewer',
      action: 'approved',
    });
  });

  it('should emit comment event for linked issue comment', async () => {
    const payload = {
      action: 'created',
      comment: {
        body: 'Update here',
        user: { login: 'commenter' },
      },
      issue: { number: 15 }, // Linked issue, not PR
    };
    const body = JSON.stringify(payload);

    await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'issue_comment',
        'X-Hub-Signature-256': createSignature(body),
      },
      body,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'comment',
      issue: 15,
      user: 'commenter',
      body: 'Update here',
    });
  });

  it('should not emit event for non-matching PR', async () => {
    const payload = {
      action: 'completed',
      check_run: {
        name: 'build',
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 99 }], // Different PR
      },
    };
    const body = JSON.stringify(payload);

    await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'check_run',
        'X-Hub-Signature-256': createSignature(body),
      },
      body,
    });

    expect(events).toHaveLength(0);
  });
});

describe('server without secret', () => {
  let server: Server;
  let port: number;
  let events: MonitorEvent[];

  beforeEach(async () => {
    events = [];
    server = createWebhookServer({
      targetPR: 42,
      linkedIssues: new Set(),
      // No secret provided
      onEvent: (event) => events.push(event),
    });
    port = await startServer(server);
  });

  afterEach(async () => {
    await stopServer(server);
  });

  it('should accept requests without signature verification', async () => {
    const payload = {
      action: 'completed',
      check_run: {
        name: 'test',
        status: 'completed',
        conclusion: 'success',
        pull_requests: [{ number: 42 }],
      },
    };
    const body = JSON.stringify(payload);

    const response = await globalThis.fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'check_run',
        // No signature header
      },
      body,
    });

    expect(response.status).toBe(200);
    expect(events).toHaveLength(1);
  });
});

describe('startServer and stopServer', () => {
  it('should start on random available port', async () => {
    const server = createWebhookServer({
      targetPR: 1,
      linkedIssues: new Set(),
      onEvent: vi.fn(),
    });

    const port = await startServer(server);
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);

    await stopServer(server);
  });

  it('should stop server cleanly', async () => {
    const server = createWebhookServer({
      targetPR: 1,
      linkedIssues: new Set(),
      onEvent: vi.fn(),
    });

    const port = await startServer(server);
    await stopServer(server);

    // Server should no longer accept connections
    await expect(
      globalThis.fetch(`http://127.0.0.1:${port}/`)
    ).rejects.toThrow();
  });
});
