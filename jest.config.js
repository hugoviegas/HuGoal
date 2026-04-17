/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      { configFile: "./babel.config.test.js" },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  // Prevent Expo/RN native modules from crashing the test runner
  transformIgnorePatterns: [
    "node_modules/(?!(firebase|@firebase)/)",
  ],
};
