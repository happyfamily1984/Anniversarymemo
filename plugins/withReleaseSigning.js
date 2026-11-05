// 플레이 스토어용 빌드에서만 업로드 키로 서명하도록 android/app/build.gradle 을 수정하는 설정 플러그인.
// RELEASE_STORE_FILE 환경 변수가 없으면(가족용 APK 빌드) 아무것도 바꾸지 않는다.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            storeFile file(System.getenv('RELEASE_STORE_FILE'))
            storePassword System.getenv('RELEASE_STORE_PASSWORD')
            keyAlias System.getenv('RELEASE_KEY_ALIAS')
            keyPassword System.getenv('RELEASE_STORE_PASSWORD')
        }`;

module.exports = function withReleaseSigning(config) {
  if (!process.env.RELEASE_STORE_FILE) return config;
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("System.getenv('RELEASE_STORE_FILE')")) return cfg;

    const debugBlock = /(signingConfigs \{\s*debug \{[^}]*\})/;
    if (!debugBlock.test(src)) throw new Error('withReleaseSigning: signingConfigs.debug 블록을 찾지 못했어요');
    src = src.replace(debugBlock, `$1${RELEASE_SIGNING}`);

    const releaseType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseType.test(src)) throw new Error('withReleaseSigning: release 빌드 타입을 찾지 못했어요');
    src = src.replace(releaseType, '$1signingConfig signingConfigs.release');

    cfg.modResults.contents = src;
    return cfg;
  });
};
