#!/usr/bin/env node
/**
 * SUPABASE IMPORTS MIGRATION SCRIPT
 * Automatically updates all files to use the UNIFIED_CLIENT
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = process.cwd();
const EXCLUDED_DIRS = [
  'node_modules', '.next', 'dist', 'build', '.git', 'cleanup-backup-*',
  'conductor', 'archived', 'backup', 'temp', 'tmp', '.cache',
  'claude-notifications.py', 'docs', 'documentation', 'scripts/debug'
];
const INCLUDED_DIRS = ['app/', 'lib/', 'components/', 'services/', 'api/', 'pages/', 'routers/', 'middleware/'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Import mappings - old imports to new unified imports
const IMPORT_MAPPINGS = {
  // Old client imports
  "from '@/lib/supabase-client'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase-simple'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase-service'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase/UNIFIED_CLIENT'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase/server-client'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase/UNIFIED_CLIENT'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '@/lib/supabase/server'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  
  // Relative imports
  "from '../lib/supabase-client'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from '../../lib/supabase-client'": "from '@/lib/supabase/UNIFIED_CLIENT'",
  "from './supabase-client'": "from '@/lib/supabase/UNIFIED_CLIENT'",
};

// Function name mappings
const FUNCTION_MAPPINGS = {
  'createSupabaseClient': 'createClient',
  'createSupabaseServerClient': 'createServerSupabaseClient',
  'getSupabaseClient': 'createClient',
  'initSupabase': 'createClient',
  'supabaseClient': 'createClient()',
};

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  functionsUpdated: 0,
  errors: []
};

console.log('🔄 Starting Supabase imports migration...');
console.log('===============================================');

// Find all relevant files - only scan important directories
function findFiles() {
  let files = [];
  
  // Only scan specific important directories
  for (const includeDir of INCLUDED_DIRS) {
    const fullDir = path.join(PROJECT_ROOT, includeDir);
    if (fs.existsSync(fullDir)) {
      console.log(`🔍 Scanning ${includeDir}...`);
      scanDirectory(fullDir, files);
    }
  }
  
  return files;
}

function scanDirectory(dir, files) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (EXCLUDED_DIRS.some(excluded => item.includes(excluded))) {
        continue;
      }
      scanDirectory(fullPath, files);
    } else if (FILE_EXTENSIONS.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
}

// Update imports in a file
function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileModified = false;
    
    // Update import statements
    for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPINGS)) {
      if (newContent.includes(oldImport)) {
        newContent = newContent.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
        stats.importsUpdated++;
        fileModified = true;
      }
    }
    
    // Update function calls
    for (const [oldFunc, newFunc] of Object.entries(FUNCTION_MAPPINGS)) {
      const oldFuncRegex = new RegExp(`\\b${oldFunc}\\b`, 'g');
      if (oldFuncRegex.test(newContent)) {
        newContent = newContent.replace(oldFuncRegex, newFunc);
        stats.functionsUpdated++;
        fileModified = true;
      }
    }
    
    // Update common patterns
    const patterns = [
      // Update createClient() calls to be more explicit
      {
        pattern: /const\s+supabase\s+=\s+createClient\(\)/g,
        replacement: 'const supabase = createClient()'
      },
      // Update server-side patterns
      {
        pattern: /createServerClient\(/g,
        replacement: 'createServerSupabaseClient('
      }
    ];
    
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        fileModified = true;
      }
    }
    
    // Write file if modified
    if (fileModified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.filesModified++;
      console.log(`✅ Updated: ${path.relative(PROJECT_ROOT, filePath)}`);
    }
    
    stats.filesScanned++;
    
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
    console.log(`❌ Error updating ${filePath}: ${error.message}`);
  }
}

// Create example usage files
function createExampleFiles() {
  console.log('\n📚 Creating migration examples...');
  
  // Client-side example
  const clientExample = `// CLIENT-SIDE USAGE EXAMPLE
// Old way (multiple imports)
// import { supabase } from '@/lib/supabase-client'
// import { createSupabaseClient } from '@/lib/supabase-simple'

// New way (unified import)
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function MyComponent() {
  const supabase = createClient()
  
  // Use as before - API is compatible
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    
  return <div>Component content</div>
}`;

  // Server-side example
  const serverExample = `// SERVER-SIDE USAGE EXAMPLE (API Routes)
// Old way (multiple imports)
// import { createServerClient } from '@/lib/supabase-server'
// import { supabaseServerClient } from '@/lib/supabase/server-client'

// New way (unified import)
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET(request) {
  const supabase = createServerSupabaseClient()
  
  // Use as before - API is compatible
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    
  return Response.json({ data })
}`;

  // Advanced example with wrapper
  const advancedExample = `// ADVANCED USAGE WITH WRAPPER
// Old way (manual context management)
// import { createSupabaseClient } from '@/lib/supabase-client'

// New way (context-aware wrapper)
import { getServerWrapper } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET(request) {
  const wrapper = getServerWrapper()
  
  // Automatic context resolution
  const { profile, error } = await wrapper.getUserProfile()
  const { barbershop_id } = await wrapper.getUserBarbershopContext()
  
  // Built-in error handling and type safety
  const health = await wrapper.healthCheck()
  
  return Response.json({ profile, barbershop_id, health })
}`;

  fs.writeFileSync('examples/client-side-migration.js', clientExample);
  fs.writeFileSync('examples/server-side-migration.js', serverExample);
  fs.writeFileSync('examples/advanced-wrapper-usage.js', advancedExample);
  
  console.log('✅ Created migration examples in examples/ directory');
}

// Main execution
async function main() {
  try {
    // Create examples directory
    if (!fs.existsSync('examples')) {
      fs.mkdirSync('examples');
    }
    
    // Find all files to update
    console.log('🔍 Scanning important directories...');
    const files = findFiles();
    console.log(`Found ${files.length} files to check`);
    
    // Update each file
    console.log('\n🔄 Updating imports...');
    for (const file of files) {
      updateFile(file);
    }
    
    // Create example files
    createExampleFiles();
    
    // Print summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('===============================================');
    console.log(`Files scanned: ${stats.filesScanned}`);
    console.log(`Files modified: ${stats.filesModified}`);
    console.log(`Imports updated: ${stats.importsUpdated}`);
    console.log(`Function calls updated: ${stats.functionsUpdated}`);
    console.log(`Errors encountered: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(({ file, error }) => {
        console.log(`  ${path.relative(PROJECT_ROOT, file)}: ${error}`);
      });
    }
    
    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('===============================================');
    console.log('Next steps:');
    console.log('1. Review the changes with: git diff');
    console.log('2. Test your application: npm run dev');
    console.log('3. Check examples in examples/ directory');
    console.log('4. Remove old client files when ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, updateFile, IMPORT_MAPPINGS, FUNCTION_MAPPINGS };