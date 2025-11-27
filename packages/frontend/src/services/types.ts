import { z } from 'zod';
import { parameterSchema, dspCodeSchema } from './schemas.js';

export type Parameter = z.infer<typeof parameterSchema>;
export type DSPCodeResponse = z.infer<typeof dspCodeSchema>;

/**
 * LLM service configuration
 */
export interface LLMServiceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Error codes for LLM service errors (const object for runtime access)
 */
export const LLMErrorCode = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Union type of all error code values
 */
// eslint-disable-next-line no-redeclare
export type LLMErrorCode = (typeof LLMErrorCode)[keyof typeof LLMErrorCode];
