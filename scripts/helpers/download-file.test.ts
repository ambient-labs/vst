import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as _FsModule from 'fs';
import type * as _FsPromisesModule from 'fs/promises';
import type * as _StreamPromisesModule from 'stream/promises';

// Use vi.hoisted to create mocks that can be accessed in vi.mock factories
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  createWriteStream: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
  pipeline: vi.fn(),
}));

vi.stubGlobal('fetch', mocks.fetch);

vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _FsModule;
  return {
    ...actual,
    createWriteStream: mocks.createWriteStream,
  };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _FsPromisesModule;
  return {
    ...actual,
    mkdir: mocks.mkdir,
    unlink: mocks.unlink,
    stat: mocks.stat,
  };
});

vi.mock('stream/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof _StreamPromisesModule;
  return {
    ...actual,
    pipeline: mocks.pipeline,
  };
});

// Import after mocks are set up
import { downloadFile } from './download-file.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should download a file successfully', async () => {
    const testContent = 'Test file content for download';
    mocks.fetch.mockResolvedValueOnce(createMockResponse(testContent));
    mocks.mkdir.mockResolvedValueOnce(undefined);
    mocks.createWriteStream.mockReturnValueOnce({});
    mocks.pipeline.mockResolvedValueOnce(undefined);
    mocks.stat.mockResolvedValueOnce({ size: 100 });

    await downloadFile('https://example.com/test-file.txt', '/tmp/test/file.txt');

    expect(mocks.fetch).toHaveBeenCalledWith('https://example.com/test-file.txt', {
      redirect: 'follow',
    });
    expect(mocks.mkdir).toHaveBeenCalledWith('/tmp/test', { recursive: true });
    expect(mocks.createWriteStream).toHaveBeenCalledWith('/tmp/test/file.txt');
    expect(mocks.pipeline).toHaveBeenCalled();
    expect(mocks.stat).toHaveBeenCalledWith('/tmp/test/file.txt');
  });

  it('should handle HTTP errors gracefully', async () => {
    mocks.fetch.mockResolvedValueOnce(
      createMockResponse('', 500, 'Internal Server Error')
    );
    mocks.mkdir.mockResolvedValueOnce(undefined);

    await expect(
      downloadFile('https://example.com/error', '/tmp/test/error.txt')
    ).rejects.toThrow('500');
  });

  it('should reject on 404 errors', async () => {
    mocks.fetch.mockResolvedValueOnce(createMockResponse('', 404, 'Not Found'));
    mocks.mkdir.mockResolvedValueOnce(undefined);

    await expect(
      downloadFile('https://example.com/not-found', '/tmp/test/404.txt')
    ).rejects.toThrow('404');
  });

  it('should throw when response body is empty', async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: null,
    } as Response);
    mocks.mkdir.mockResolvedValueOnce(undefined);

    await expect(
      downloadFile('https://example.com/no-body', '/tmp/test/no-body.txt')
    ).rejects.toThrow('Response body is empty');
  });

  it('should delete file and throw when downloaded file is empty', async () => {
    mocks.fetch.mockResolvedValueOnce(createMockResponse(''));
    mocks.mkdir.mockResolvedValueOnce(undefined);
    mocks.createWriteStream.mockReturnValueOnce({});
    mocks.pipeline.mockResolvedValueOnce(undefined);
    mocks.stat.mockResolvedValueOnce({ size: 0 });
    mocks.unlink.mockResolvedValueOnce(undefined);

    await expect(
      downloadFile('https://example.com/empty', '/tmp/test/empty.txt')
    ).rejects.toThrow('Downloaded file is empty');

    expect(mocks.unlink).toHaveBeenCalledWith('/tmp/test/empty.txt');
  });
});
