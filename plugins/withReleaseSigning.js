const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// `expo prebuild --clean` regenerates android/ from the template, which only has a
// `debug` signingConfig, so release builds would be signed with the debug key and
// rejected by Play Console. This plugin makes release signing "config as code":
//   1. writes MYAPP_RELEASE_* credentials into android/gradle.properties
//   2. adds signingConfigs.release to android/app/build.gradle
//   3. points buildTypes.release at signingConfigs.release
//
// Security: this file is committed, so it must never contain passwords. Secrets come
// from the gitignored key/signing.local.json, or from environment variables (CI).
// The keystore itself lives in key/ and is gitignored too.

const SIGNING_FILE = path.join('key', 'signing.local.json');
const DEFAULT_STORE_FILE = 'qraft-upload.jks';

function loadSecrets(projectRoot) {
  let fromFile = {};
  const file = path.join(projectRoot, SIGNING_FILE);
  if (fs.existsSync(file)) {
    try {
      fromFile = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`[withReleaseSigning] could not read ${SIGNING_FILE}: ${e.message}`);
    }
  }

  const secrets = {
    MYAPP_RELEASE_STORE_FILE: fromFile.storeFile || process.env.MYAPP_RELEASE_STORE_FILE || DEFAULT_STORE_FILE,
    MYAPP_RELEASE_KEY_ALIAS: fromFile.keyAlias || process.env.MYAPP_RELEASE_KEY_ALIAS,
    MYAPP_RELEASE_STORE_PASSWORD: fromFile.storePassword || process.env.MYAPP_RELEASE_STORE_PASSWORD,
    MYAPP_RELEASE_KEY_PASSWORD: fromFile.keyPassword || process.env.MYAPP_RELEASE_KEY_PASSWORD,
  };
  const missing = Object.entries(secrets)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const storePath = path.join(projectRoot, 'key', secrets.MYAPP_RELEASE_STORE_FILE);
  if (!missing.length && !fs.existsSync(storePath)) {
    throw new Error(`[withReleaseSigning] keystore not found: ${storePath}`);
  }
  return { secrets, missing };
}

const MARKER = '// >>> withReleaseSigning (generated, do not edit)';

const RELEASE_SIGNING_BLOCK = `        release {
            ${MARKER}
            storeFile file("../../key/\${MYAPP_RELEASE_STORE_FILE}")
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
            // <<< withReleaseSigning
        }
`;

function applyReleaseSigning(contents) {
  let src = contents;

  // 1. Insert signingConfigs.release right after `signingConfigs {` (once; the marker makes it idempotent).
  if (!src.includes(MARKER)) {
    if (!/signingConfigs\s*\{/.test(src)) {
      throw new Error('[withReleaseSigning] `signingConfigs {` block not found in app/build.gradle');
    }
    src = src.replace(/signingConfigs\s*\{\s*\n/, (match) => `${match}${RELEASE_SIGNING_BLOCK}`);
  }

  // 2. Point buildTypes.release at the release config. The Expo template puts
  //    "// Caution! ..." comment lines between `release {` and `signingConfig`,
  //    so skip any comment lines; otherwise release silently keeps the debug key.
  src = src.replace(
    /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig\s+signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );

  if (!/buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/.test(src)) {
    throw new Error('[withReleaseSigning] could not point buildTypes.release at signingConfigs.release');
  }
  return src;
}

function withReleaseGradleProperties(config, secrets) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(secrets)) {
      cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
}

module.exports = function withReleaseSigning(config) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const { secrets, missing } = loadSecrets(projectRoot);

  if (missing.length) {
    // Don't write half a configuration; warn loudly instead.
    console.warn(
      `[withReleaseSigning] SKIPPED: missing signing credentials (${missing.join(', ')}). ` +
        `Create ${SIGNING_FILE} or set env vars. Release builds will use the debug key.`,
    );
    return config;
  }

  config = withReleaseGradleProperties(config, secrets);
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.applyReleaseSigning = applyReleaseSigning;
