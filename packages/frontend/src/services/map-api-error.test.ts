import { describe, it, expect } from 'vitest';
import { mapApiError } from './map-api-error.js';
import { LLMServiceError } from './llm-service-error.js';
import { LLMErrorCode } from './types.js';

describe('mapApiError', () => {
  describe('passthrough', () => {
    it('should return LLMServiceError instances unchanged', () => {
      const original = new LLMServiceError('test', LLMErrorCode.UNKNOWN);
      const result = mapApiError(original);
      expect(result).toBe(original);
    });
  });

  describe('rate limit errors', () => {
    it('should map 429 status to RATE_LIMIT', () => {
      const error = Object.assign(new Error('Too many requests'), { status: 429 });
      const result = mapApiError(error);
      expect(result).toBeInstanceOf(LLMServiceError);
      expect(result.code).toBe(LLMErrorCode.RATE_LIMIT);
      expect(result.message).toContain('Rate limit');
      expect(result.cause).toBe(error);
    });

    it('should map "rate limit" message to RATE_LIMIT', () => {
      const error = new Error('rate limit exceeded');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.RATE_LIMIT);
    });

    it('should handle case-insensitive rate limit message', () => {
      const error = new Error('RATE LIMIT exceeded');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.RATE_LIMIT);
    });
  });

  describe('authentication errors', () => {
    it('should map 401 status to INVALID_API_KEY', () => {
      const error = Object.assign(new Error('Unauthorized'), { status: 401 });
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.INVALID_API_KEY);
      expect(result.message).toContain('Invalid API key');
    });

    it('should map 403 status to INVALID_API_KEY', () => {
      const error = Object.assign(new Error('Forbidden'), { status: 403 });
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.INVALID_API_KEY);
    });

    it('should map "invalid api key" message to INVALID_API_KEY', () => {
      const error = new Error('invalid api key provided');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.INVALID_API_KEY);
    });

    it('should map "authentication" message to INVALID_API_KEY', () => {
      const error = new Error('authentication failed');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.INVALID_API_KEY);
    });
  });

  describe('network errors', () => {
    it('should map "network" message to NETWORK_ERROR', () => {
      const error = new Error('network error occurred');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.NETWORK_ERROR);
      expect(result.message).toContain('Network error');
    });

    it('should map "econnrefused" message to NETWORK_ERROR', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.NETWORK_ERROR);
    });

    it('should map "enotfound" message to NETWORK_ERROR', () => {
      const error = new Error('getaddrinfo ENOTFOUND api.anthropic.com');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.NETWORK_ERROR);
    });

    it('should map "fetch failed" message to NETWORK_ERROR', () => {
      const error = new Error('fetch failed');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.NETWORK_ERROR);
    });
  });

  describe('unknown errors', () => {
    it('should map unrecognized Error to UNKNOWN', () => {
      const error = new Error('something unexpected happened');
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.UNKNOWN);
      expect(result.message).toContain('unexpected error');
      expect(result.message).toContain('something unexpected happened');
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'plain object error' };
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.UNKNOWN);
    });

    it('should handle string errors', () => {
      const result = mapApiError('string error');
      expect(result.code).toBe(LLMErrorCode.UNKNOWN);
      expect(result.message).toContain('string error');
    });

    it('should handle null/undefined', () => {
      expect(mapApiError(null).code).toBe(LLMErrorCode.UNKNOWN);
      expect(mapApiError(undefined).code).toBe(LLMErrorCode.UNKNOWN);
    });
  });

  describe('status code extraction', () => {
    it('should extract numeric status from error object', () => {
      const error = { message: 'error', status: 429 };
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.RATE_LIMIT);
    });

    it('should ignore non-numeric status', () => {
      const error = { message: 'error', status: '429' };
      const result = mapApiError(error);
      expect(result.code).toBe(LLMErrorCode.UNKNOWN);
    });
  });
});
