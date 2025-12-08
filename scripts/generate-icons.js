#!/usr/bin/env node
/**
 * Generate PWA icons from the base SVG icon
 * Run with: node scripts/generate-icons.js
 *
 * Requires sharp: npm install sharp --save-dev (if not already installed)
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Sharp not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const outputDir = path.join(__dirname, '../public/icons');

  // Icon sizes needed for PWA
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  console.log('Generating PWA icons...\n');

  // Read the SVG file
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate each size
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Generate maskable icon (with safe zone padding)
  // Maskable icons need the important content within a safe zone (center 80%)
  const maskableSize = 512;
  const maskablePath = path.join(outputDir, `maskable-icon-${maskableSize}x${maskableSize}.png`);

  await sharp(svgBuffer)
    .resize(maskableSize, maskableSize)
    .png()
    .toFile(maskablePath);

  console.log(`  Created: maskable-icon-${maskableSize}x${maskableSize}.png`);

  // Generate shortcut icons
  const shortcuts = ['discover', 'watchlist', 'blend'];
  for (const shortcut of shortcuts) {
    const shortcutPath = path.join(outputDir, `shortcut-${shortcut}.png`);

    await sharp(svgBuffer)
      .resize(96, 96)
      .png()
      .toFile(shortcutPath);

    console.log(`  Created: shortcut-${shortcut}.png`);
  }

  // Generate Apple touch icon
  const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);

  console.log(`  Created: apple-touch-icon.png`);

  // Generate favicon
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));

  console.log(`  Created: favicon.png`);

  console.log('\nDone! PWA icons generated successfully.');
}

generateIcons().catch(console.error);
