#!/usr/bin/env tsx

import { main } from './main.js';

try {
  await main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
