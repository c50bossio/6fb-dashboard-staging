#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'playwright-report',
  'test-results',
  'supabase-mcp'
];

// File extensions to process
const VALID_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

let totalRemoved = 0;
let filesProcessed = 0;
let filesModified = 0;

async function removeConsoleLogs(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Remove console.log but preserve console.error, console.warn, etc.
    let modifiedContent = content;
    let localRemoved = 0;
    
    // Match console.log with various patterns
    const consoleLogPattern = /console\.log\s*\([^)]*\)(?:\s*;)?/g;
    
    // Count occurrences
    const matches = content.match(consoleLogPattern);
    if (matches) {
      localRemoved = matches.length;
    }
    
    // Remove console.log statements
    modifiedContent = modifiedContent.replace(consoleLogPattern, '');
    
    // Clean up extra empty lines
    modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (localRemoved > 0) {
      await fs.writeFile(filePath, modifiedContent, 'utf8');
      totalRemoved += localRemoved;
      filesModified++;
      console.log(`✓ Removed ${localRemoved} console.log(s) from ${path.relative(process.cwd(), filePath)}`);
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

async function processDirectory(dirPath) {
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        // Skip certain directories
        if (!SKIP_DIRS.includes(item) && !item.startsWith('.')) {
          await processDirectory(fullPath);
        }
      } else if (stats.isFile()) {
        const ext = path.extname(item);
        if (VALID_EXTENSIONS.includes(ext)) {
          await removeConsoleLogs(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

async function main() {
  console.log('🧹 Starting console.log removal...\n');
  
  const startTime = Date.now();
  const rootPath = process.cwd();
  
  await processDirectory(rootPath);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Console.log Removal Complete!');
  console.log('='.repeat(50));
  console.log(`📊 Statistics:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Console.logs removed: ${totalRemoved}`);
  console.log(`   Time taken: ${duration}s`);
  console.log('='.repeat(50));
  
  if (totalRemoved > 0) {
    console.log('\n💡 Recommendations:');
    console.log('   1. Run "npm run lint" to check for any issues');
    console.log('   2. Run "npm run build" to ensure build still works');
    console.log('   3. Commit changes: git add -A && git commit -m "chore: remove console.log statements for production"');
  }
}

// Run the script
main().catch(console.error);