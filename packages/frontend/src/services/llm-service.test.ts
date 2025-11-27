import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LLMService,
  createLLMService,
  isValidApiKeyFormat,
  LLMServiceError,
  LLMErrorCode,
  type DSPCodeResponse,
} from './llm-service.js';

// Mock the AI SDK modules
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  streamObject: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'mock-model')),
}));

import { generateObject, streamObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);
const mockStreamObject = vi.mocked(streamObject);

describe('isValidApiKeyFormat', () => {
  it('should return true for valid Anthropic API key format', () => {
    const validKey = 'sk-ant-api03-' + 'x'.repeat(100); // Valid format with sufficient length
    expect(isValidApiKeyFormat(validKey)).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidApiKeyFormat('')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isValidApiKeyFormat(null as unknown as string)).toBe(false);
    expect(isValidApiKeyFormat(undefined as unknown as string)).toBe(false);
  });

  it('should return false for keys not starting with sk-ant-', () => {
    expect(isValidApiKeyFormat('sk-' + 'x'.repeat(100))).toBe(false);
    expect(isValidApiKeyFormat('invalid-key')).toBe(false);
  });

  it('should return false for keys that are too short', () => {
    expect(isValidApiKeyFormat('sk-ant-short')).toBe(false);
  });

  it('should trim whitespace from keys', () => {
    const validKey = '  sk-ant-api03-' + 'x'.repeat(100) + '  ';
    expect(isValidApiKeyFormat(validKey)).toBe(true);
  });
});

describe('LLMService', () => {
  const validApiKey = 'sk-ant-api03-' + 'x'.repeat(100);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid API key', () => {
      const service = new LLMService({ apiKey: validApiKey });
      expect(service).toBeInstanceOf(LLMService);
    });

    it('should throw LLMServiceError for invalid API key format', () => {
      expect(() => new LLMService({ apiKey: 'invalid-key' })).toThrow(LLMServiceError);
      expect(() => new LLMService({ apiKey: 'invalid-key' })).toThrow('Invalid API key format');
    });

    it('should use custom model if provided', () => {
      const service = new LLMService({
        apiKey: validApiKey,
        model: 'claude-3-opus-20240229',
      });
      expect(service).toBeInstanceOf(LLMService);
    });
  });

  describe('generateDSPCode', () => {
    it('should generate DSP code successfully', async () => {
      const mockResponse: DSPCodeResponse = {
        code: 'el.cycle(440)',
        explanation: 'A simple 440Hz sine wave oscillator',
        parameters: [{ name: 'frequency', min: 20, max: 20000, default: 440, unit: 'Hz' }],
      };

      mockGenerateObject.mockResolvedValueOnce({
        object: mockResponse,
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50 },
        rawResponse: {} as Response,
        warnings: [],
        request: {},
        response: {
          id: 'test',
          modelId: 'test',
          timestamp: new Date(),
          headers: {},
        },
        experimental_providerMetadata: undefined,
      } as Awaited<ReturnType<typeof generateObject>>);

      const service = new LLMService({ apiKey: validApiKey });
      const result = await service.generateDSPCode('Create a sine wave');

      expect(result).toEqual(mockResponse);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should throw LLMServiceError on rate limit', async () => {
      // Create error with status property
      const rateLimitError = Object.assign(new Error('rate limit exceeded'), {
        status: 429,
      });
      mockGenerateObject.mockRejectedValue(rateLimitError);

      const service = new LLMService({ apiKey: validApiKey });
      try {
        await service.generateDSPCode('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe(LLMErrorCode.RATE_LIMIT);
      }
    });

    it('should throw LLMServiceError on invalid API key', async () => {
      const authError = Object.assign(new Error('invalid api key'), {
        status: 401,
      });
      mockGenerateObject.mockRejectedValue(authError);

      const service = new LLMService({ apiKey: validApiKey });
      try {
        await service.generateDSPCode('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe(LLMErrorCode.INVALID_API_KEY);
      }
    });

    it('should throw LLMServiceError on network error', async () => {
      const networkError = new Error('fetch failed: ECONNREFUSED');
      mockGenerateObject.mockRejectedValue(networkError);

      const service = new LLMService({ apiKey: validApiKey });
      try {
        await service.generateDSPCode('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe(LLMErrorCode.NETWORK_ERROR);
      }
    });
  });

  describe('generateDSPCodeStream', () => {
    it('should stream DSP code generation with partial updates', async () => {
      const mockResponse: DSPCodeResponse = {
        code: 'el.cycle(440)',
        explanation: 'A sine wave',
        parameters: [],
      };

      const partialObjects = [{ code: 'el.' }, { code: 'el.cycle(' }, mockResponse];

      // Create an async generator for partialObjectStream
      async function* createPartialStream() {
        for (const obj of partialObjects) {
          yield obj;
        }
      }

      mockStreamObject.mockReturnValueOnce({
        partialObjectStream: createPartialStream(),
        object: Promise.resolve(mockResponse),
        textStream: (async function* () {})(),
        fullStream: (async function* () {})(),
        usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
        rawResponse: Promise.resolve({} as Response),
        warnings: Promise.resolve([]),
        request: Promise.resolve({}),
        response: Promise.resolve({
          id: 'test',
          modelId: 'test',
          timestamp: new Date(),
          headers: {},
        }),
        experimental_providerMetadata: Promise.resolve(undefined),
      } as ReturnType<typeof streamObject>);

      const service = new LLMService({ apiKey: validApiKey });
      const partialUpdates: Partial<DSPCodeResponse>[] = [];

      const result = await service.generateDSPCodeStream('test', (partial) => {
        partialUpdates.push(partial);
      });

      expect(result).toEqual(mockResponse);
      expect(partialUpdates.length).toBeGreaterThan(0);
    });

    it('should work without partial callback', async () => {
      const mockResponse: DSPCodeResponse = {
        code: 'el.cycle(440)',
        explanation: 'A sine wave',
        parameters: [],
      };

      async function* createPartialStream() {
        yield mockResponse;
      }

      mockStreamObject.mockReturnValueOnce({
        partialObjectStream: createPartialStream(),
        object: Promise.resolve(mockResponse),
        textStream: (async function* () {})(),
        fullStream: (async function* () {})(),
        usage: Promise.resolve({ promptTokens: 100, completionTokens: 50 }),
        rawResponse: Promise.resolve({} as Response),
        warnings: Promise.resolve([]),
        request: Promise.resolve({}),
        response: Promise.resolve({
          id: 'test',
          modelId: 'test',
          timestamp: new Date(),
          headers: {},
        }),
        experimental_providerMetadata: Promise.resolve(undefined),
      } as ReturnType<typeof streamObject>);

      const service = new LLMService({ apiKey: validApiKey });
      const result = await service.generateDSPCodeStream('test');

      expect(result).toEqual(mockResponse);
    });

    it('should handle streaming errors', async () => {
      const networkError = new Error('network error');
      mockStreamObject.mockImplementationOnce(() => {
        throw networkError;
      });

      const service = new LLMService({ apiKey: validApiKey });
      await expect(service.generateDSPCodeStream('test')).rejects.toThrow(LLMServiceError);
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid working API key', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { valid: true },
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5 },
        rawResponse: {} as Response,
        warnings: [],
        request: {},
        response: {
          id: 'test',
          modelId: 'test',
          timestamp: new Date(),
          headers: {},
        },
        experimental_providerMetadata: undefined,
      } as Awaited<ReturnType<typeof generateObject>>);

      const service = new LLMService({ apiKey: validApiKey });
      const result = await service.validateApiKey();

      expect(result).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      const authError = new Error('invalid api key');
      Object.assign(authError, { status: 401 });
      mockGenerateObject.mockRejectedValueOnce(authError);

      const service = new LLMService({ apiKey: validApiKey });
      const result = await service.validateApiKey();

      expect(result).toBe(false);
    });

    it('should throw non-auth errors', async () => {
      const networkError = new Error('network error');
      mockGenerateObject.mockRejectedValueOnce(networkError);

      const service = new LLMService({ apiKey: validApiKey });
      await expect(service.validateApiKey()).rejects.toThrow(LLMServiceError);
    });
  });
});

describe('createLLMService', () => {
  const validApiKey = 'sk-ant-api03-' + 'x'.repeat(100);

  it('should create LLMService instance', () => {
    const service = createLLMService({ apiKey: validApiKey });
    expect(service).toBeInstanceOf(LLMService);
  });
});

describe('LLMServiceError', () => {
  it('should create error with message, code, and cause', () => {
    const cause = new Error('original error');
    const error = new LLMServiceError('Test error', LLMErrorCode.NETWORK_ERROR, cause);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(LLMErrorCode.NETWORK_ERROR);
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('LLMServiceError');
  });

  it('should be instanceof Error', () => {
    const error = new LLMServiceError('Test', LLMErrorCode.UNKNOWN);
    expect(error).toBeInstanceOf(Error);
  });
});
