#!/usr/bin/env node

/**
 * Fix Supabase Service Import Issues
 * 
 * This script fixes remaining imports that reference supabase-service
 * and updates them to use the createServiceRoleClient from UNIFIED_CLIENT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');

console.log('🔧 Fix Supabase Service Import Issues');
console.log('====================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

// Service import mappings
const serviceMappings = [
  {
    from: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"'
  },
  {
    from: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'import { createServiceRoleClient } from "@/lib/supabase/UNIFIED_CLIENT"'
  }
];

// Function to update service usage patterns
function updateServiceUsage(content) {
  let updated = content;
  
  // Replace createServiceRoleClient() usage with createServiceRoleClient()
  updated = updated.replace(/createServiceRoleClient()/g, 'createServiceRoleClient()');
  
  return updated;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix import statements
    for (const mapping of serviceMappings) {
      if (content.includes(mapping.from)) {
        content = content.replace(mapping.from, mapping.to);
        modified = true;
      }
    }
    
    // Fix usage patterns if imports were changed
    if (modified) {
      content = updateServiceUsage(content);
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

console.log('📂 Scanning for files with supabase-service imports...\n');

const allFiles = getAllJSFiles(projectRoot);
const filesToFix = [];

// Find files that need fixing
for (const file of allFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('supabase-service')) {
      filesToFix.push(file);
    }
  } catch (err) {
    // Skip files we can't read
  }
}

console.log(`🔍 Found ${filesToFix.length} files needing service import fixes\n`);

if (filesToFix.length === 0) {
  console.log('✅ No supabase-service imports found!');
  process.exit(0);
}

let fixedCount = 0;

for (const file of filesToFix) {
  if (fixImportsInFile(file)) {
    fixedCount++;
  }
}

console.log('\n📊 Service Import Fix Summary');
console.log('=============================');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Files needing fixes: ${filesToFix.length}`);
console.log(`Files fixed: ${fixedCount}`);

if (!dryRun && fixedCount > 0) {
  console.log('\n✅ All supabase-service imports have been resolved!');
  console.log('\n🚀 Next Steps:');
  console.log('- Test build: npm run build');
  console.log('- Test deployment: ./UNIFIED_DEPLOY.sh development --dry-run');
}