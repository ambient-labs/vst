import { join } from 'path';

// Note: "artefacts" is the spelling used by JUCE (British English)
// nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
// Justification: This is a CLI tool, paths come from internal config, not user input
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
