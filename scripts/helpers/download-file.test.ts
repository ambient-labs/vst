import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { downloadFile } from './download-file.js';
import { Readable } from 'stream';

// Mock globalThis.fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create a mock Response with a ReadableStream body
function createMockResponse(
  content: string,
  status = 200,
  statusText = 'OK'
): Response {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    body: stream,
  } as Response;
}

describe('downloadFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'download-test-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should download a file successfully', async () => {
    const dest = join(testDir, 'test-download.txt');
    const testContent = 'Test file content for download';

    mockFetch.mockResolvedValueOnce(createMockResponse(testContent));

    await downloadFile('https://example.com/test-file.txt', dest);

    const content = await readFile(dest, 'utf-8');
    expect(content).toBe(testContent);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/test-file.txt', {
      redirect: 'follow',
    });
  });

  it('should handle HTTP errors gracefully', async () => {
    const dest = join(testDir, 'test-error.txt');

    mockFetch.mockResolvedValueOnce(
      createMockResponse('', 500, 'Internal Server Error')
    );

    await expect(downloadFile('https://example.com/error', dest)).rejects.toThrow(
      '500'
    );
  });

  it('should reject on 404 errors', async () => {
    const dest = join(testDir, 'test-404.txt');

    mockFetch.mockResolvedValueOnce(createMockResponse('', 404, 'Not Found'));

    await expect(downloadFile('https://example.com/not-found', dest)).rejects.toThrow(
      '404'
    );
  });

  it('should throw when response body is empty', async () => {
    const dest = join(testDir, 'test-no-body.txt');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: null,
    } as Response);

    await expect(downloadFile('https://example.com/no-body', dest)).rejects.toThrow(
      'Response body is empty'
    );
  });
});
