import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const svgBuffer = readFileSync('public/icons/generate-icon.svg');

const sizes = [16, 32, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer, { density: 72 })
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon-${size}.png`);
    console.log(`Generated icon-${size}.png`);
  }
  
  // Create a simple fallback icon using canvas
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="20" fill="#3B82F6"/>
    <text x="50%" y="50%" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">★</text>
  </svg>`;
  
  writeFileSync('public/icons/icon.svg', fallbackSvg);
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
