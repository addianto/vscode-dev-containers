/*--------------------------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
 *-------------------------------------------------------------------------------------------------------------*/

const path = require('path');
const push = require('./push').push;
const utils = require('./utils');
const packageJson = require('../../package.json');

 async function package(release, updateLatest, registry, registryUser) {

    // First, push images, update content
    const stagingFolder = await push(release, updateLatest, registry, registryUser);
 
    // Then package
    console.log(`\n(*) **** Package ${release} ****`);

    console.log(`(*) Updating package.json with release version...`);
    const version = release.charAt(0) === 'v' ? release.substr(1) : release;
    const packageJsonPath = path.join(stagingFolder, 'package.json');
    const packageJsonRaw = await utils.readFile(packageJsonPath);
    const packageJsonModified = packageJsonRaw.replace(/"version".?:.?".+"/, `"version": "${version}"`);
    await utils.writeFile(packageJsonPath, packageJsonModified);

    console.log('(*) Packaging...');
    const opts = { stdio: 'inherit', cwd: stagingFolder, shell: true };
    await utils.spawn('yarn', ['install'], opts);
    await utils.spawn('npm', ['pack'], opts); // Need to use npm due to https://github.com/yarnpkg/yarn/issues/685
    
    console.log('(*) Moving package...');
    // Output filename should use the release vX.X.X like yarn rather than just version like npm
    // since release tag includes the "v" and this is what is easily available during CI.
    const outputPath = path.join(__dirname, '..', '..', `${packageJson.name}-v${packageJson.version}`);
    await utils.rename(path.join(stagingFolder, `${packageJson.name}-${packageJson.version}`), outputPath);

    // And finally clean up
    console.log('(*) Cleaning up...');
    await utils.rimraf(stagingFolder);

    console.log('(*) Done!!');

    return outputPath;
}

module.exports = {
    package: package
}