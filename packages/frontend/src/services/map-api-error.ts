import { LLMErrorCode } from './types.js';
import { LLMServiceError } from './llm-service-error.js';

/**
 * Maps API errors to LLMServiceError instances
 */
export function mapApiError(error: unknown): LLMServiceError {
  if (error instanceof LLMServiceError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Extract status code from error object if present
  let status: number | undefined;
  if (error && typeof error === 'object' && 'status' in error) {
    const statusValue = (error as Record<string, unknown>).status;
    if (typeof statusValue === 'number') {
      status = statusValue;
    }
  }

  // Check for rate limiting
  if (status === 429 || lowerMessage.includes('rate limit')) {
    return new LLMServiceError(
      'Rate limit exceeded. Please wait before making more requests.',
      LLMErrorCode.RATE_LIMIT,
      error
    );
  }

  // Check for authentication errors
  if (
    status === 401 ||
    status === 403 ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('authentication')
  ) {
    return new LLMServiceError(
      'Invalid API key. Please check your Anthropic API key.',
      LLMErrorCode.INVALID_API_KEY,
      error
    );
  }

  // Check for network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('fetch failed')
  ) {
    return new LLMServiceError(
      'Network error. Please check your internet connection.',
      LLMErrorCode.NETWORK_ERROR,
      error
    );
  }

  // Default to unknown error
  return new LLMServiceError(
    `An unexpected error occurred: ${errorMessage}`,
    LLMErrorCode.UNKNOWN,
    error
  );
}
