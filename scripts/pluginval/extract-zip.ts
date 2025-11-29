import extractZipLib from 'extract-zip';

export const extractZip = async (zipPath: string, destDir: string) => {
  await extractZipLib(zipPath, { dir: destDir });
};
