#!/usr/bin/env node
/**
 * Increments semantic version in app.json (and package.json).
 * Usage: node scripts/version-bump.js [patch|minor|major]
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const type = process.argv[2] || 'patch';
const current = appJson.expo.version || '1.0.0';
const [major, minor, patch] = current.split('.').map(Number);

let next;
if (type === 'major') next = `${major + 1}.0.0`;
else if (type === 'minor') next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

appJson.expo.version = next;
packageJson.version = next;

// Use CI run number when available to keep monotonically increasing build numbers.
const ciBuildNumber = Number(process.env.CI_BUILD_NUMBER || 0);

// Bump android versionCode
if (appJson.expo.android) {
  const prev = appJson.expo.android.versionCode ?? 1;
  appJson.expo.android.versionCode = ciBuildNumber > 0 ? ciBuildNumber : prev + 1;
}

// Bump iOS buildNumber when present
if (appJson.expo.ios) {
  const prev = Number(appJson.expo.ios.buildNumber ?? 1);
  appJson.expo.ios.buildNumber = String(ciBuildNumber > 0 ? ciBuildNumber : prev + 1);
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Version bumped: ${current} → ${next}`);
