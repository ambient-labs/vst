import { execFileSync } from 'child_process';

export function extractZip(
  zipPath: string,
  destDir: string,
  platform: string = process.platform
): void {
  if (platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-command',
        'Expand-Archive',
        '-Path',
        zipPath,
        '-DestinationPath',
        destDir,
        '-Force',
      ],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'inherit' });
  }
}
