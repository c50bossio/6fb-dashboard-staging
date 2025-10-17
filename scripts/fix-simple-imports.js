#!/usr/bin/env node

/**
 * Fix Supabase Simple Import Issues
 * 
 * This script fixes the last remaining imports that reference supabase-simple
 * and updates them to use the createServiceRoleClient from UNIFIED_CLIENT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');

console.log('🔧 Fix Final Supabase Simple Import Issues');
console.log('==========================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

// Simple client import mappings
const simpleMappings = [
  {
    from: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"'
  }
];

// Function to update simple client usage patterns
function updateSimpleClientUsage(content) {
  let updated = content;
  
  // Replace await createServiceRoleClient() calls with createServiceRoleClient()
  updated = updated.replace(/createServiceClient\(\)/g, 'await createServiceRoleClient()');
  updated = updated.replace(/const\s+supabase\s*=\s*createServiceClient\(\)/g, 'const supabase = await createServiceRoleClient()');
  
  return updated;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix import statements
    for (const mapping of simpleMappings) {
      if (content.includes(mapping.from)) {
        content = content.replace(mapping.from, mapping.to);
        modified = true;
      }
    }
    
    // Fix usage patterns if imports were changed
    if (modified) {
      content = updateSimpleClientUsage(content);
    }
    
    if (modified) {
      if (dryRun) {
        console.log(`🔧 WOULD FIX: ${path.relative(projectRoot, filePath)}`);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ FIXED: ${path.relative(projectRoot, filePath)}`);
      }
      return true;
    }
    
    return false;
  } catch (err) {
    console.log(`❌ ERROR fixing ${path.relative(projectRoot, filePath)}: ${err.message}`);
    return false;
  }
}

// Get all JavaScript/TypeScript files
function getAllJSFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (!item.startsWith('.') && 
            item !== 'node_modules' && 
            item !== 'archived' &&
            item !== '.next') {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        // Include JS/TS files
        if (item.match(/\.(js|jsx|ts|tsx)$/)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

console.log('📂 Scanning for files with supabase-simple imports...\n');

const allFiles = getAllJSFiles(projectRoot);
const filesToFix = [];

// Find files that need fixing
for (const file of allFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const mapping of simpleMappings) {
      if (content.includes(mapping.from)) {
        filesToFix.push(file);
        break;
      }
    }
  } catch (err) {
    // Skip files we can't read
  }
}

console.log(`🔍 Found ${filesToFix.length} files needing simple client import fixes\n`);

if (filesToFix.length === 0) {
  console.log('✅ No supabase-simple imports found!');
  process.exit(0);
}

let fixedCount = 0;

for (const file of filesToFix) {
  if (fixImportsInFile(file)) {
    fixedCount++;
  }
}

console.log('\n📊 Simple Import Fix Summary');
console.log('=============================');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Files needing fixes: ${filesToFix.length}`);
console.log(`Files fixed: ${fixedCount}`);

if (!dryRun && fixedCount > 0) {
  console.log('\n✅ All supabase-simple imports have been resolved!');
  console.log('\n🚀 Final Test:');
  console.log('- npm run build');
}