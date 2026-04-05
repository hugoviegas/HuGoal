const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase uses a component registry that relies on shared module singletons.
// Metro 0.80+ (Expo SDK 53+) supports package.json "exports" by default, which
// causes @firebase/component to load its ESM build while @firebase/auth loads
// its RN/CJS build — two separate instances — so auth never gets registered.
// Disabling package exports forces consistent CJS/RN bundle resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
