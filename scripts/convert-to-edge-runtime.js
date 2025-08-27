#!/usr/bin/env node

/**
 * Convert all API routes to Edge Runtime
 * This script adds 'export const runtime = "edge"' to all API route files
 * that don't already have it, forcing them to use Edge Runtime
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const apiRoutePattern = path.join(__dirname, '..', 'app', 'api', '**', '*.js');
const apiRoutes = glob.sync(apiRoutePattern);

let converted = 0;
let alreadyEdge = 0;
let skipped = 0;

apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('export const runtime')) {
    if (content.includes('runtime = "edge"') || content.includes("runtime = 'edge'")) {
      alreadyEdge++;
    } else {
      , filePath)} - has non-edge runtime`);
      skipped++;
    }
    return;
  }
  
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
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
    , filePath)} - likely needs Node.js features`);
    skipped++;
    return;
  }
  
  let updatedContent;
  
  if (content.startsWith("'use") || content.startsWith('"use')) {
    const lines = content.split('\n');
    lines.splice(1, 0, "export const runtime = 'edge'");
    updatedContent = lines.join('\n');
  }
  else if (content.includes('import ')) {
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "export const runtime = 'edge'");
      updatedContent = lines.join('\n');
    } else {
      updatedContent = "export const runtime = 'edge'\n" + content;
    }
  }
  else {
    updatedContent = "export const runtime = 'edge'\n\n" + content;
  }
  
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  , filePath)}`);
  converted++;
});

const nextConfigPath = path.join(__dirname, '..', 'next.config.mjs');
const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (!nextConfig.includes('// Force Edge Runtime for all API routes')) {
  const updatedNextConfig = nextConfig.replace(
    'const nextConfig = {',
    `const nextConfig = {
  experimental: {
    runtime: 'edge',
  },`
  );
  
  fs.writeFileSync(nextConfigPath, updatedNextConfig, 'utf8');
  
}

