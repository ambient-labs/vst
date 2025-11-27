import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, streamObject } from 'ai';
import { z } from 'zod';

// ============================================================================
// Types and Schemas
// ============================================================================

/**
 * Schema for a DSP parameter that can be controlled in the UI
 */
export const parameterSchema = z.object({
  name: z.string().describe('Parameter name in camelCase'),
  min: z.number().describe('Minimum value'),
  max: z.number().describe('Maximum value'),
  default: z.number().describe('Default value'),
  unit: z.string().optional().describe('Unit of measurement (e.g., "Hz", "dB", "ms")'),
});

/**
 * Schema for generated DSP code response
 */
export const dspCodeSchema = z.object({
  code: z.string().describe('Complete ElementaryJS DSP code'),
  explanation: z.string().describe('What the code does'),
  parameters: z.array(parameterSchema).describe('Controllable parameters'),
});

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
 * Error types for LLM service
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

export enum LLMErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Validates that an API key has the expected format for Anthropic
 * @param apiKey - The API key to validate
 * @returns true if valid format, false otherwise
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Anthropic API keys start with "sk-ant-" and have a specific length range
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith('sk-ant-')) {
    return false;
  }

  // Keys are typically 100+ characters
  if (trimmed.length < 50) {
    return false;
  }

  return true;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Maps API errors to our error types
 */
function mapApiError(error: unknown): LLMServiceError {
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

// ============================================================================
// LLM Service Class
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are an expert audio DSP engineer specializing in ElementaryJS, a functional reactive programming library for audio signal processing.

When generating DSP code:
1. Use ElementaryJS primitives (el.cycle, el.lowpass, el.highpass, el.delay, etc.)
2. Ensure the code is complete and can be used directly
3. Include proper signal flow from input to output
4. Keep code efficient and avoid unnecessary computations
5. Use meaningful parameter names in camelCase

The code should export a function that takes input signals and returns processed output signals.`;

/**
 * Service for interacting with Claude API for DSP code generation
 */
export class LLMService {
  private readonly anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: LLMServiceConfig) {
    if (!isValidApiKeyFormat(config.apiKey)) {
      throw new LLMServiceError(
        'Invalid API key format. Anthropic API keys should start with "sk-ant-".',
        LLMErrorCode.INVALID_API_KEY
      );
    }

    this.anthropic = createAnthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  /**
   * Generate DSP code from a natural language prompt
   * @param prompt - Description of the desired audio effect
   * @returns Generated DSP code, explanation, and parameters
   */
  async generateDSPCode(prompt: string): Promise<DSPCodeResponse> {
    try {
      const result = await generateObject({
        model: this.anthropic(this.model),
        schema: dspCodeSchema,
        system: SYSTEM_PROMPT,
        prompt: `Generate ElementaryJS DSP code for the following audio effect:\n\n${prompt}`,
        maxTokens: this.maxTokens,
      });

      return result.object;
    } catch (error) {
      throw mapApiError(error);
    }
  }

  /**
   * Generate DSP code with streaming support for real-time UI updates
   * @param prompt - Description of the desired audio effect
   * @param onPartialObject - Callback for partial object updates during streaming
   * @returns Final generated DSP code response
   */
  async generateDSPCodeStream(
    prompt: string,
    onPartialObject?: (partial: Partial<DSPCodeResponse>) => void
  ): Promise<DSPCodeResponse> {
    try {
      const result = streamObject({
        model: this.anthropic(this.model),
        schema: dspCodeSchema,
        system: SYSTEM_PROMPT,
        prompt: `Generate ElementaryJS DSP code for the following audio effect:\n\n${prompt}`,
        maxTokens: this.maxTokens,
      });

      // Process partial objects if callback provided
      if (onPartialObject) {
        for await (const partialObject of result.partialObjectStream) {
          onPartialObject(partialObject);
        }
      }

      // Wait for final result
      const finalResult = await result.object;
      return finalResult;
    } catch (error) {
      throw mapApiError(error);
    }
  }

  /**
   * Validate that the API key works by making a minimal request
   * @returns true if the API key is valid and working
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the key
      await generateObject({
        model: this.anthropic(this.model),
        schema: z.object({ valid: z.boolean() }),
        prompt: 'Respond with valid: true',
        maxTokens: 50,
      });
      return true;
    } catch (error) {
      const mappedError = mapApiError(error);
      if (mappedError.code === LLMErrorCode.INVALID_API_KEY) {
        return false;
      }
      // Re-throw non-auth errors
      throw mappedError;
    }
  }
}

/**
 * Factory function to create an LLM service instance
 */
export function createLLMService(config: LLMServiceConfig): LLMService {
  return new LLMService(config);
}
