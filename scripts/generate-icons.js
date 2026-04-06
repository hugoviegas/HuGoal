#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node scripts/generate-icons.js <source-image> [destFolder]');
  process.exit(1);
}

const src = path.resolve(argv[0]);
const dest = path.resolve(argv[1] || path.join(process.cwd(), 'assets'));

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const tasks = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 512 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'notification-icon.png', size: 256 },
  { name: 'splash-icon.png', size: 2048 },
  { name: 'logo_app_icon.png', size: 1024 }
];

(async () => {
  try {
    for (const t of tasks) {
      const out = path.join(dest, t.name);
      await sharp(src)
        .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(out);
      console.log('Wrote', out);
    }
    console.log('All icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
})();
