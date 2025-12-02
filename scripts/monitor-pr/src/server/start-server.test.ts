import { describe, it, expect, vi } from 'vitest';
import { createWebhookServer } from './create-webhook-server.js';
import { startServer, stopServer } from './start-server.js';

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
    await expect(globalThis.fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
  });
});
