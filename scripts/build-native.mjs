#!/usr/bin/env zx

const rootDir = await path.resolve(__dirname, '..');
const buildDir = await path.join(rootDir, 'native', 'build', 'scripted');

echo(`Root directory: ${rootDir}`);
echo(`Build directory: ${buildDir}`);

// Clean the build directory before we build
await fs.remove(buildDir);
await fs.ensureDir(buildDir);

cd(buildDir);

const buildType = argv.dev ? 'Debug' : 'Release';
const devFlag = argv.dev ? '-DELEM_DEV_LOCALHOST=1' : '';

await $`cmake -DCMAKE_BUILD_TYPE=${buildType} -DCMAKE_INSTALL_PREFIX=./out/ -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15 ${devFlag} ../..`;
await $`cmake --build . --config ${buildType} -j 4`;
