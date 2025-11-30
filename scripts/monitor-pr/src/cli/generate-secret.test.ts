import { describe, it, expect } from 'vitest';
import { generateSecret } from './generate-secret.js';

describe('generateSecret', () => {
  it('should generate a 32-character string', () => {
    const secret = generateSecret();
    expect(secret).toHaveLength(32);
  });

  it('should only contain alphanumeric characters', () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('should generate different secrets on each call', () => {
    const secret1 = generateSecret();
    const secret2 = generateSecret();
    expect(secret1).not.toBe(secret2);
  });
});
