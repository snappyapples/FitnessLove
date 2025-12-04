import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const svgContent = readFileSync(join(rootDir, 'src/app/icon.svg'), 'utf-8');

const sizes = [192, 512];

async function generateIcons() {
  const iconsDir = join(rootDir, 'public/icons');
  mkdirSync(iconsDir, { recursive: true });

  for (const size of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(join(rootDir, 'public/apple-touch-icon.png'));

  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
