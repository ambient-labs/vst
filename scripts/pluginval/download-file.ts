import { createWriteStream, statSync, unlinkSync } from 'fs';
import https from 'https';

export async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          if (!redirectUrl.startsWith('https://')) {
            reject(new Error('Redirect must use HTTPS'));
            return;
          }
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = createWriteStream(dest);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();

        try {
          const stats = statSync(dest);
          if (stats.size === 0) {
            reject(new Error('Downloaded file is empty'));
            return;
          }
        } catch (err) {
          reject(err);
          return;
        }

        resolve();
      });

      fileStream.on('error', (err) => {
        // Clean up partial file on error
        try {
          unlinkSync(dest);
        } catch {
          // Ignore cleanup errors
        }
        reject(err);
      });
    }).on('error', (err) => {
      // Clean up partial file on error
      try {
        unlinkSync(dest);
      } catch {
        // Ignore cleanup errors
      }
      reject(err);
    });
  });
}
