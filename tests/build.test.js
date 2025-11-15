import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

describe('Build Verification', () => {
  it('should build the native plugin successfully', () => {
    // Run the native build script
    // This will throw if the build fails
    const output = execSync('pnpm run build-native', {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 300000, // 5 minutes for build
    });

    expect(output).toBeDefined();
  }, 300000); // 5 minute timeout for the test

  it('should create VST3 artifact', () => {
    const vst3Path = join(rootDir, 'native/build/scripted/SRVB_artefacts/Release/VST3/SRVB.vst3');
    expect(existsSync(vst3Path)).toBe(true);
  });

  it('should create AU artifact on macOS', () => {
    // Only check for AU on macOS
    if (process.platform === 'darwin') {
      const auPath = join(rootDir, 'native/build/scripted/SRVB_artefacts/Release/AU/SRVB.component');
      expect(existsSync(auPath)).toBe(true);
    } else {
      // Skip test on non-macOS platforms
      expect(true).toBe(true);
    }
  });
});
