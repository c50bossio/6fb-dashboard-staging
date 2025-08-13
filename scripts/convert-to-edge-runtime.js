#!/usr/bin/env node

/**
 * Convert all API routes to Edge Runtime
 * This script adds 'export const runtime = "edge"' to all API route files
 * that don't already have it, forcing them to use Edge Runtime
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all API route files
const apiRoutePattern = path.join(__dirname, '..', 'app', 'api', '**', '*.js');
const apiRoutes = glob.sync(apiRoutePattern);

let converted = 0;
let alreadyEdge = 0;
let skipped = 0;

console.log(`🚀 Converting API routes to Edge Runtime...`);
console.log(`Found ${apiRoutes.length} API route files\n`);

apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has runtime export
  if (content.includes('export const runtime')) {
    if (content.includes('runtime = "edge"') || content.includes("runtime = 'edge'")) {
      alreadyEdge++;
    } else {
      console.log(`⚠️  Skipping ${path.relative(process.cwd(), filePath)} - has non-edge runtime`);
      skipped++;
    }
    return;
  }
  
  // Check if it's a dynamic route that might need Node.js features
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Skip certain routes that might need Node.js runtime
  const skipPatterns = [
    'upload',
    'download',
    'file',
    'stripe-webhook',
    'webhook',
    'cron',
    'background'
  ];
  
  const shouldSkip = skipPatterns.some(pattern => 
    filePath.toLowerCase().includes(pattern)
  );
  
  if (shouldSkip) {
    console.log(`⏭️  Skipping ${path.relative(process.cwd(), filePath)} - likely needs Node.js features`);
    skipped++;
    return;
  }
  
  // Add Edge Runtime export at the top of the file, after imports
  let updatedContent;
  
  // If file starts with 'use client' or similar directive
  if (content.startsWith("'use") || content.startsWith('"use')) {
    const lines = content.split('\n');
    lines.splice(1, 0, "export const runtime = 'edge'");
    updatedContent = lines.join('\n');
  }
  // If file has imports
  else if (content.includes('import ')) {
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      // Add after last import
      lines.splice(lastImportIndex + 1, 0, "export const runtime = 'edge'");
      updatedContent = lines.join('\n');
    } else {
      // Add at the very beginning
      updatedContent = "export const runtime = 'edge'\n" + content;
    }
  }
  // No imports, add at the beginning
  else {
    updatedContent = "export const runtime = 'edge'\n\n" + content;
  }
  
  // Write the updated content
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`✅ Converted: ${path.relative(process.cwd(), filePath)}`);
  converted++;
});

console.log('\n📊 Conversion Summary:');
console.log(`✅ Converted to Edge: ${converted} routes`);
console.log(`🔵 Already Edge Runtime: ${alreadyEdge} routes`);
console.log(`⏭️  Skipped: ${skipped} routes`);
console.log(`📈 Total Edge Runtime: ${converted + alreadyEdge} / ${apiRoutes.length} routes`);

// Also update next.config.mjs to force Edge Runtime as default
const nextConfigPath = path.join(__dirname, '..', 'next.config.mjs');
const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (!nextConfig.includes('// Force Edge Runtime for all API routes')) {
  const updatedNextConfig = nextConfig.replace(
    'const nextConfig = {',
    `const nextConfig = {
  // Force Edge Runtime for all API routes
  experimental: {
    runtime: 'edge',
  },`
  );
  
  fs.writeFileSync(nextConfigPath, updatedNextConfig, 'utf8');
  console.log('\n✅ Updated next.config.mjs to default to Edge Runtime');
}

console.log('\n🎉 Edge Runtime conversion complete!');
console.log('Note: Some routes may need manual fixes if they use Node.js-specific features.');