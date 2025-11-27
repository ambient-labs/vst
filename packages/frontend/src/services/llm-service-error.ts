import { LLMErrorCode } from './types.js';

/**
 * Custom error class for LLM service errors
 */
export class LLMServiceError extends Error {
  constructor(
    message: string,
    public readonly code: LLMErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}
