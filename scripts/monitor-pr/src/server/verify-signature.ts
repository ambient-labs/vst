// HMAC-SHA256 signature verification for GitHub webhooks

import { createHmac, timingSafeEqual } from 'node:crypto';

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
