import { describe, test, expect } from 'vitest';
import { getPluginPath } from './get-plugin-path.js';

describe('getPluginPath', () => {
  test.each([
    {
      rootDir: '/root',
      pluginName: 'MyPlugin',
      buildType: undefined,
      expected: '/root/native/build/scripted/MyPlugin_artefacts/Release/VST3/MyPlugin.vst3',
      description: 'default build type',
    },
    {
      rootDir: '/root',
      pluginName: 'MyPlugin',
      buildType: 'Debug',
      expected: '/root/native/build/scripted/MyPlugin_artefacts/Debug/VST3/MyPlugin.vst3',
      description: 'custom build type',
    },
    {
      rootDir: '/root',
      pluginName: 'My-Plugin_v2',
      buildType: undefined,
      expected:
        '/root/native/build/scripted/My-Plugin_v2_artefacts/Release/VST3/My-Plugin_v2.vst3',
      description: 'plugin name with special characters',
    },
  ])('should construct correct path with $description', ({ rootDir, pluginName, buildType, expected }) => {
    const result = getPluginPath(rootDir, pluginName, buildType);
    expect(result).toBe(expected);
  });
});
