import { describe, it, expect } from 'vitest';
import { main } from './index.js';

describe('monitor-pr', () => {
  it('should export main function', () => {
    expect(typeof main).toBe('function');
  });
});
