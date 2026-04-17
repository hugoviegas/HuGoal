// Minimal Babel config for Jest — uses only packages already present in node_modules.
// Avoids Expo/NativeWind/Reanimated native plugins that crash outside a Metro bundler.
module.exports = {
  plugins: [
    // Strip TypeScript types
    ["@babel/plugin-transform-typescript", { allowDeclareFields: true }],
    // Convert ES module import/export to CommonJS (required by Jest)
    "@babel/plugin-transform-modules-commonjs",
  ],
};
