#!/usr/bin/env node
// CLI entry point for monitor-pr
// Real-time GitHub PR monitoring via webhooks

import { main } from '../src/index.js';

try {
  await main();
} catch (err) {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
}
