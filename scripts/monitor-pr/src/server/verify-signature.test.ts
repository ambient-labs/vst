import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifySignature } from './verify-signature.js';

const secret = 'test-secret';
const payload = '{"test": "data"}';

function createSignature(body: string, key: string): string {
  const sig = createHmac('sha256', key).update(body).digest('hex');
  return `sha256=${sig}`;
}

describe('verifySignature', () => {
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
