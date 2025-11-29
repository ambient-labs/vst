import { describe, it, expect } from 'vitest';
import { getPluginPath } from './get-plugin-path.js';

describe('getPluginPath', () => {
  it('should construct correct path with default build type', () => {
    const result = getPluginPath('/root', 'MyPlugin');

    expect(result).toBe(
      '/root/native/build/scripted/MyPlugin_artefacts/Release/VST3/MyPlugin.vst3'
    );
  });

  it('should construct correct path with custom build type', () => {
    const result = getPluginPath('/root', 'MyPlugin', 'Debug');

    expect(result).toBe(
      '/root/native/build/scripted/MyPlugin_artefacts/Debug/VST3/MyPlugin.vst3'
    );
  });

  it('should handle plugin names with special characters', () => {
    const result = getPluginPath('/root', 'My-Plugin_v2');

    expect(result).toBe(
      '/root/native/build/scripted/My-Plugin_v2_artefacts/Release/VST3/My-Plugin_v2.vst3'
    );
  });
});
