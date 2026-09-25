const { withGradleProperties } = require('expo/config-plugins');

// Release builds run lint (lintVitalAnalyzeRelease) on every native module, which
// exhausts the template's 512m Metaspace ("OutOfMemoryError: Metaspace").
// `expo prebuild` regenerates android/gradle.properties, so the larger heap lives here.
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'));
    cfg.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return cfg;
  });
};
