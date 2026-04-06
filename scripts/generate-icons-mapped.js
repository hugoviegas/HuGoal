#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');

const mapping = [
  {
    // Use the transparent `icon.png` for app icon and favicons
    src: path.join(assetsDir, 'icon.png'),
    outputs: [
      { name: 'icon.png', size: 1024 },
      { name: 'favicon.png', size: 512 },
      { name: 'favicon-192.png', size: 192 },
      { name: 'favicon-32.png', size: 32 }
    ]
  },
  {
    // Use `logo_app_icon.png` for the remaining images
    src: path.join(assetsDir, 'logo_app_icon.png'),
    outputs: [
      { name: 'adaptive-icon.png', size: 1024 },
      { name: 'notification-icon.png', size: 256 },
      { name: 'splash-icon.png', size: 2048 },
      { name: 'logo_app_icon.png', size: 1024 }
    ]
  }
];

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

(async () => {
  try {
    for (const item of mapping) {
      if (!fs.existsSync(item.src)) {
        console.error('Source image not found:', item.src);
        continue;
      }

      for (const out of item.outputs) {
        const outPath = path.join(assetsDir, out.name);
        // If the source path and output path are identical, skip to avoid sharp error
        if (path.resolve(outPath) === path.resolve(item.src)) {
          console.log('Skipping identical input/output for', outPath);
          continue;
        }

        await sharp(item.src)
          .resize(out.size, out.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(outPath);
        console.log('Wrote', outPath);
      }
    }

    console.log('All mapped icons generated successfully.');
  } catch (err) {
    console.error('Error generating mapped icons:', err);
    process.exit(1);
  }
})();
