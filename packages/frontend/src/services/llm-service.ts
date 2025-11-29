import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, streamObject } from 'ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';

import { dspCodeSchema } from './schemas.js';
import { DSPCodeResponse, LLMServiceConfig, LLMErrorCode } from './types.js';
import { LLMServiceError } from './llm-service-error.js';
import { mapApiError } from './map-api-error.js';

// Load system prompt from file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'system-prompt.txt'), 'utf-8');

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
// LLM Service Class
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

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
