#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach(size => {
  const filename = path.join(iconsDir, `icon-${size}x${size}.png`)
  console.log(`Note: Create ${filename} for production`)
})

console.log('PWA icon placeholders noted. Add actual PNG files for production.')
