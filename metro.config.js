const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase relies on shared module singletons via @firebase/component.
// With Metro's package exports enabled (default SDK 53+), @firebase/component
// loads its ESM build while @firebase/auth loads its CJS/RN build — two separate
// instances — so auth never registers. Disabling package exports fixes this.
// NOTE: This is safe with New Architecture — Reanimated 4 and native-aware packages
// use "react-native" field in resolverMainFields (below) for correct resolution.
config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ["react-native", "main", "module"];

// Prevent lucide-react (web-only, SVG DOM) from being bundled on native.
// lucide-react is only used in explicitly web-targeted files (InteractiveMenuWeb).
// On native builds, redirect to lucide-react-native to avoid DOM crashes.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "lucide-react": require.resolve("lucide-react-native"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
