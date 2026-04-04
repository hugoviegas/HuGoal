#!/usr/bin/env node
/**
 * Increments the versionCode in app.json.
 * Usage: node scripts/version-bump.js [patch|minor|major]
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const type = process.argv[2] || 'patch';
const current = appJson.expo.version || '1.0.0';
const [major, minor, patch] = current.split('.').map(Number);

let next;
if (type === 'major') next = `${major + 1}.0.0`;
else if (type === 'minor') next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

appJson.expo.version = next;

// Bump android versionCode
if (appJson.expo.android) {
  const prev = appJson.expo.android.versionCode ?? 1;
  appJson.expo.android.versionCode = prev + 1;
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Version bumped: ${current} → ${next}`);
