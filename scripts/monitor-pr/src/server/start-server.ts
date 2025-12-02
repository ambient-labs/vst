// Server start/stop utilities

import type { Server } from 'node:http';

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
