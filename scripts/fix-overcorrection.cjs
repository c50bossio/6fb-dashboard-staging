#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Track statistics
let filesFixed = 0;
let totalFixes = 0;

// Patterns to fix overcorrection
const fixPatterns = [
  // Fix multiple "barber" prefixes in camelCase
  { pattern: /barberbarber+barbershop/gi, replacement: 'barbershop' },
  { pattern: /barberbarbershop/gi, replacement: 'barbershop' },
  
  // Fix multiple "barber" prefixes in snake_case
  { pattern: /barber_barber+_barbershop/gi, replacement: 'barbershop' },
  { pattern: /barber_barbershop/gi, replacement: 'barbershop' },
  
  // Fix specific overcorrected patterns
  { pattern: /barberbarberbarbershopId/g, replacement: 'barbershopId' },
  { pattern: /barberbarbershopId/g, replacement: 'barbershopId' },
  { pattern: /barber_barber_barbershop_id/g, replacement: 'barbershop_id' },
  { pattern: /barber_barbershop_id/g, replacement: 'barbershop_id' },
];

function shouldSkipFile(filePath) {
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /\.next/,
    /build/,
    /dist/,
    /\.pyc$/,
    /__pycache__/,
    /\.sqlite/,
    /\.db$/,
    /package-lock\.json/,
    /yarn\.lock/,
    /\.log$/,
    /\.env/,
    /fix-overcorrection\.cjs$/  // Don't modify this script itself
  ];
  
  return skipPatterns.some(pattern => pattern.test(filePath));
}

function fixFile(filePath) {
  if (shouldSkipFile(filePath)) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileFixCount = 0;
    
    // Apply all fix patterns
    fixPatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fileFixCount += matches.length;
      }
    });
    
    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      totalFixes += fileFixCount;
      console.log(`✅ Fixed ${fileFixCount} overcorrections in: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    if (error.code !== 'EISDIR') {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }
}

function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !shouldSkipFile(fullPath)) {
        processDirectory(fullPath);
      } else if (stat.isFile()) {
        // Process JavaScript, TypeScript, Python, and SQL files
        if (/\.(js|jsx|ts|tsx|py|sql)$/.test(item)) {
          fixFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

console.log('🔧 Fixing overcorrected field names...\n');
console.log('This will fix patterns like:');
console.log('  - barberbarbershopId → barbershopId');
console.log('  - barberbarberbarbershopId → barbershopId');
console.log('  - barber_barbershop_id → barbershop_id\n');

// Start from the project root
const projectRoot = path.resolve(__dirname, '..');
processDirectory(projectRoot);

console.log('\n📊 Summary:');
console.log(`Files fixed: ${filesFixed}`);
console.log(`Total corrections: ${totalFixes}`);
console.log('\n✅ Overcorrection fix complete!');
console.log('\nNext steps:');
console.log('1. Review the changes with: git diff');
console.log('2. Test the application: npm run dev');
console.log('3. Commit if everything works: git add -A && git commit -m "fix: correct overcorrected field names"');