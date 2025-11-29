import { join } from 'path';

// Note: "artefacts" is the spelling used by JUCE (British English)
export const getPluginPath = (rootDir: string, pluginName: string, buildType = 'Release') =>
  join(
    rootDir,
    'native',
    'build',
    'scripted',
    `${pluginName}_artefacts`,
    buildType,
    'VST3',
    `${pluginName}.vst3`
  );
