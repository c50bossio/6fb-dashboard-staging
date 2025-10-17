#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

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
    const content = await readFile(filePath, 'utf8');
    
    // Pattern to match console.log statements (including multiline)
    // Preserves console.error, console.warn, console.info, console.debug
    const patterns = [
      // Single line console.log
      /^\s*console\.log\([^)]*\);?\s*$/gm,
      // Multi-line console.log
      /^\s*console\.log\([^)]*\n([^)]*\n)*[^)]*\);?\s*$/gm,
      // console.log in conditionals or inline
      /[;\{\}\s]console\.log\([^)]*\);?/g,
      // console.log with template literals
      /console\.log\(`[^`]*`\);?/g,
      // console.log with complex arguments
      /console\.log\([\s\S]*?\);/g
    ];
    
    let modifiedContent = content;
    let localRemoved = 0;
    
    // Remove console.log but preserve console.error, console.warn, etc.
    modifiedContent = modifiedContent.replace(/console\.log\s*\([^)]*\)/g, (match) => {
      localRemoved++;
      return '/* console.log removed */';
    });
    
    // Clean up empty lines left behind
    modifiedContent = modifiedContent.replace(/\/\* console\.log removed \*\/;?\s*\n/g, '');
    modifiedContent = modifiedContent.replace(/\s*\/\* console\.log removed \*\/;?\s*/g, '');
    
    if (localRemoved > 0) {
      await writeFile(filePath, modifiedContent, 'utf8');
      totalRemoved += localRemoved;
      filesModified++;
       from ${path.relative(process.cwd(), filePath)}`);
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

async function processDirectory(dirPath) {
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await stat(fullPath);
      
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

  const startTime = Date.now();
  const rootPath = process.cwd();
  
  await processDirectory(rootPath);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  );
  
  );

  );
  
  if (totalRemoved > 0) {

  }
}

// Run the script
main().catch(console.error);