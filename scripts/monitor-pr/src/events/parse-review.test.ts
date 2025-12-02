import { describe, it, expect } from 'vitest';
import { parseReview } from './parse-review.js';

describe('parseReview', () => {
  const basePayload = {
    action: 'submitted',
    review: {
      state: 'approved',
      user: { login: 'alice' },
    },
    pull_request: {
      number: 42,
    },
  };

  it('should parse approved review', () => {
    const result = parseReview(basePayload, 42, new Set());
    expect(result).toEqual({
      event: 'review',
      pr: 42,
      user: 'alice',
      action: 'approved',
    });
  });

  it('should parse changes_requested review', () => {
    const payload = {
      ...basePayload,
      review: { ...basePayload.review, state: 'changes_requested' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('changes_requested');
  });

  it('should parse commented review', () => {
    const payload = {
      ...basePayload,
      review: { ...basePayload.review, state: 'commented' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('commented');
  });

  it('should parse dismissed review', () => {
    const payload = {
      ...basePayload,
      action: 'dismissed',
      review: { ...basePayload.review, state: 'approved' },
    };
    const result = parseReview(payload, 42, new Set());
    expect(result?.action).toBe('dismissed');
  });

  it('should return null for non-matching PR', () => {
    const result = parseReview(basePayload, 99, new Set());
    expect(result).toBeNull();
  });

  it('should return null for non-submitted action', () => {
    const payload = { ...basePayload, action: 'edited' };
    const result = parseReview(payload, 42, new Set());
    expect(result).toBeNull();
  });
});
