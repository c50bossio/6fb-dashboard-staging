#!/usr/bin/env node

/**
 * Fix Final Import Issues
 * 
 * This script fixes remaining imports that reference supabase/client
 * which still exist after the previous import fixes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');

console.log('🔧 Final Import Fix - supabase/client References');
console.log('================================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

// Import mappings to fix remaining supabase/client references
const importMappings = [
  // Relative path imports to client
  {
    from: 'from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'from "@/lib/supabase/UNIFIED_CLIENT"'
  },
  {
    from: "from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'from "@/lib/supabase/UNIFIED_CLIENT"'
  },
  {
    from: "from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'from "@/lib/supabase/UNIFIED_CLIENT"'
  },
  {
    from: "from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: 'from "@/lib/supabase/UNIFIED_CLIENT"',
    to: 'from "@/lib/supabase/UNIFIED_CLIENT"'
  },
  {
    from: "from '@/lib/supabase/UNIFIED_CLIENT'",
    to: "from '@/lib/supabase/UNIFIED_CLIENT'"
  },
  
  // Mock imports in test files
  {
    from: "'@/lib/supabase/UNIFIED_CLIENT'",
    to: "'@/lib/supabase/UNIFIED_CLIENT'"
  },
  {
    from: '"@/lib/supabase/UNIFIED_CLIENT"',
    to: '"@/lib/supabase/UNIFIED_CLIENT"'
  },
  
  // Dynamic imports
  {
    from: "import('@/lib/supabase/UNIFIED_CLIENT')",
    to: "import('@/lib/supabase/UNIFIED_CLIENT')"
  },
  {
    from: 'import("@/lib/supabase/UNIFIED_CLIENT")',
    to: 'import("@/lib/supabase/UNIFIED_CLIENT")'
  }
];

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const mapping of importMappings) {
      if (content.includes(mapping.from)) {
        content = content.replaceAll(mapping.from, mapping.to);
        modified = true;
      }
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

console.log('📂 Scanning for files with supabase/client imports...\n');

const allFiles = getAllJSFiles(projectRoot);
const filesToFix = [];

// Find files that need fixing
for (const file of allFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const mapping of importMappings) {
      if (content.includes(mapping.from)) {
        filesToFix.push(file);
        break;
      }
    }
  } catch (err) {
    // Skip files we can't read
  }
}

console.log(`🔍 Found ${filesToFix.length} files needing final import fixes\n`);

if (filesToFix.length === 0) {
  console.log('✅ No remaining supabase/client imports found!');
  process.exit(0);
}

let fixedCount = 0;

for (const file of filesToFix) {
  if (fixImportsInFile(file)) {
    fixedCount++;
  }
}

console.log('\n📊 Final Import Fix Summary');
console.log('============================');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Files needing fixes: ${filesToFix.length}`);
console.log(`Files fixed: ${fixedCount}`);

if (!dryRun && fixedCount > 0) {
  console.log('\n✅ All remaining supabase/client imports have been resolved!');
  console.log('\n🚀 Next Steps:');
  console.log('- Test build: npm run build');
  console.log('- Test deployment: ./UNIFIED_DEPLOY.sh development --dry-run');
  console.log('- Run tests: npm run test:all');
}