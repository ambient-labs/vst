import { join } from 'path';

export function getPluginPath(
  rootDir: string,
  pluginName: string,
  buildType: string = 'Release'
): string {
  return join(
    rootDir,
    'native',
    'build',
    'scripted',
    `${pluginName}_artefacts`,
    buildType,
    'VST3',
    `${pluginName}.vst3`
  );
}
