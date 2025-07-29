#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates placeholder PWA icons in multiple sizes.
 * For production, replace with actual branded icons.
 */

const fs = require('fs');
const path = require('path');

// SVG template for PWA icons
const createIconSVG = (size, maskable = false) => {
  const padding = maskable ? size * 0.1 : 0; // 10% padding for maskable icons
  const iconSize = size - (padding * 2);
  const iconOffset = padding;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  ${maskable ? `<rect width="${size}" height="${size}" fill="url(#gradient)" rx="${size * 0.1}"/>` : ''}
  
  <g transform="translate(${iconOffset}, ${iconOffset})">
    <rect width="${iconSize}" height="${iconSize}" fill="${maskable ? '#ffffff' : 'url(#gradient)'}" rx="${iconSize * 0.1}"/>
    
    <!-- 6FB Text -->
    <text x="${iconSize/2}" y="${iconSize * 0.4}" 
          font-family="Arial, sans-serif" 
          font-size="${iconSize * 0.2}" 
          font-weight="bold" 
          text-anchor="middle" 
          fill="${maskable ? '#1f2937' : '#ffffff'}">6FB</text>
    
    <!-- AI Symbol -->
    <circle cx="${iconSize * 0.3}" cy="${iconSize * 0.65}" r="${iconSize * 0.08}" fill="${maskable ? '#3b82f6' : '#ffffff'}"/>
    <circle cx="${iconSize * 0.7}" cy="${iconSize * 0.65}" r="${iconSize * 0.08}" fill="${maskable ? '#3b82f6' : '#ffffff'}"/>
    <path d="M ${iconSize * 0.3} ${iconSize * 0.8} Q ${iconSize * 0.5} ${iconSize * 0.75} ${iconSize * 0.7} ${iconSize * 0.8}" 
          stroke="${maskable ? '#3b82f6' : '#ffffff'}" 
          stroke-width="${iconSize * 0.02}" 
          fill="none"/>
  </g>
</svg>`;
};

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

iconSizes.forEach(size => {
  // Regular icon
  const regularSVG = createIconSVG(size, false);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), regularSVG);
  
  // Maskable icons (only for 192 and 512)
  if (size === 192 || size === 512) {
    const maskableSVG = createIconSVG(size, true);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}-maskable.svg`), maskableSVG);
  }
  
  console.log(`✓ Generated icon-${size}x${size}.svg`);
});

// Generate shortcut icons
const shortcuts = ['dashboard', 'agents', 'integrations'];
shortcuts.forEach(shortcut => {
  const shortcutSVG = createIconSVG(192, false);
  fs.writeFileSync(path.join(iconsDir, `shortcut-${shortcut}.svg`), shortcutSVG);
  console.log(`✓ Generated shortcut-${shortcut}.svg`);
});

console.log('\n🎉 PWA icons generated successfully!');
console.log('\n📝 Note: These are placeholder SVG icons. For production:');
console.log('   1. Replace with actual branded PNG/SVG icons');
console.log('   2. Ensure icons follow platform design guidelines');
console.log('   3. Test maskable icons on different Android launchers');
console.log('   4. Optimize file sizes for better performance');