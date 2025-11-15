import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const BUILD_TIMEOUT_MS = 180000; // 180 seconds (3 minutes, Linux builds can be slower)

describe('Build Verification', () => {
  it('should build the native plugin successfully and create VST3 artifact', async () => {
    // Run the native build script
    const { stdout } = await execAsync('pnpm run build-native', {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: BUILD_TIMEOUT_MS,
    });

    expect(stdout).toBeDefined();

    // Verify VST3 artifact was created
    const vst3Path = join(rootDir, 'native/build/scripted/SRVB_artefacts/Release/VST3/SRVB.vst3');
    await expect(access(vst3Path)).resolves.toBeUndefined();
  }, BUILD_TIMEOUT_MS);
});
