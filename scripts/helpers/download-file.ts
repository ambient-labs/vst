import { createWriteStream } from 'fs';
import { mkdir, unlink, stat } from 'fs/promises';
import { dirname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export const downloadFile = async (url: string, dest: string) => {
  // Ensure destination directory exists
  await mkdir(dirname(dest), { recursive: true });

  // Use globalThis.fetch to avoid ESLint no-undef error (Node 18+ native fetch)
  const response = await globalThis.fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  const fileStream = createWriteStream(dest);

  // Convert web ReadableStream to Node.js Readable and pipe to file
  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, fileStream);

  // Verify file was downloaded
  const stats = await stat(dest);
  if (stats.size === 0) {
    await unlink(dest);
    throw new Error('Downloaded file is empty');
  }
};
