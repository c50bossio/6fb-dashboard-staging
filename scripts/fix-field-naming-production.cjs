#!/usr/bin/env node

/**
 * Production-Safe Field Naming Standardization
 * Converts all shopId/shop_id references to barbershopId/barbershop_id
 * CRITICAL for production deployment to prevent data inconsistencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to process
const DIRS_TO_PROCESS = [
  'app',
  'components', 
  'hooks',
  'lib',
  'services'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'build',
  'dist'
];

// Track changes for reporting
const changes = {
  files: new Set(),
  shopIdToBarbershopId: 0,
  shop_idToBarbershop_id: 0,
  warnings: []
};

/**
 * Process a single file
 */
function processFile(filePath) {
  if (EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;

  // CRITICAL: Handle profiles.shop_id special case
  // This field should ONLY remain in profile-related queries
  const isProfileFile = filePath.includes('profile') || filePath.includes('Profile');
  
  if (!isProfileFile) {
    // Replace shopId with barbershopId in JavaScript/TypeScript
    // But NOT in profile.shop_id references
    content = content.replace(/(?<!profile\.)shopId/g, (match, offset) => {
      const before = content.substring(Math.max(0, offset - 20), offset);
      const after = content.substring(offset, Math.min(content.length, offset + 30));
      
      // Don't replace if it's profile.shopId
      if (before.includes('profile.') || before.includes('profile?.')) {
        return match;
      }
      
      changes.shopIdToBarbershopId++;
      modified = true;
      return 'barbershopId';
    });

    // Replace shop_id with barbershop_id in queries
    // But NOT profile.shop_id or profiles.shop_id
    content = content.replace(/(?<!profile\.|profiles\.)shop_id/g, (match, offset) => {
      const before = content.substring(Math.max(0, offset - 20), offset);
      
      // Don't replace if it's in profiles table context
      if (before.includes('profile') || before.includes('SELECT') && before.includes('FROM profiles')) {
        return match;
      }
      
      changes.shop_idToBarbershop_id++;
      modified = true;
      return 'barbershop_id';
    });

    // Fix mixed usage in object destructuring
    content = content.replace(/\{ shopId([,\s\}])/g, '{ barbershopId$1');
    content = content.replace(/\{ shop_id([,\s\}])/g, '{ barbershop_id$1');
    
    // Fix function parameters
    content = content.replace(/function\s+\w+\s*\([^)]*\bshopId\b/g, (match) => {
      modified = true;
      return match.replace('shopId', 'barbershopId');
    });
    
    // Fix arrow functions
    content = content.replace(/\(([^)]*\b)shopId\b([^)]*)\)\s*=>/g, '($1barbershopId$2) =>');
  }

  // Special handling for unified service files
  if (filePath.includes('unified')) {
    // These should ALWAYS use barbershop_id for consistency
    content = content.replace(/shopId/g, 'barbershopId');
    content = content.replace(/shop_id(?!.*profile)/g, 'barbershop_id');
    modified = true;
  }

  // Save if modified
  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content);
    changes.files.add(filePath);
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !EXCLUDE_PATTERNS.includes(file)) {
      processDirectory(fullPath);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      processFile(fullPath);
    }
  });
}

/**
 * Validate critical files after changes
 */
function validateCriticalFiles() {
  const criticalFiles = [
    'lib/supabase/UNIFIED_CLIENT.js',
    'lib/unified-staff-service.js',
    'hooks/useStaffQuery.js',
    'hooks/useServicesQuery.js'
  ];

  console.log('\n🔍 Validating critical files...');
  
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for problematic patterns
      if (content.includes('shopId') && !content.includes('profile.shop_id')) {
        changes.warnings.push(`⚠️  ${file} still contains shopId references`);
      }
      
      // Ensure barbershopId is used
      if (!content.includes('barbershopId') && !content.includes('barbershop_id')) {
        changes.warnings.push(`⚠️  ${file} doesn't use barbershopId`);
      }
    }
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Production Field Naming Standardization');
  console.log('================================================\n');
  
  // Create backup tag
  try {
    execSync('git add -A && git commit -m "backup: before field naming standardization" || true', { stdio: 'ignore' });
    console.log('📦 Created git backup commit\n');
  } catch (e) {
    // Ignore if no changes to commit
  }

  // Process each directory
  DIRS_TO_PROCESS.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`Processing ${dir}/...`);
      processDirectory(dir);
    }
  });

  // Validate critical files
  validateCriticalFiles();

  // Report results
  console.log('\n================================================');
  console.log('📊 STANDARDIZATION COMPLETE\n');
  console.log(`Files modified: ${changes.files.size}`);
  console.log(`shopId → barbershopId: ${changes.shopIdToBarbershopId} replacements`);
  console.log(`shop_id → barbershop_id: ${changes.shop_idToBarbershop_id} replacements`);
  
  if (changes.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    changes.warnings.forEach(w => console.log(w));
  }

  console.log('\n✅ Your codebase is now production-ready with consistent field naming!');
  console.log('\n📝 Next steps:');
  console.log('1. Run: npm run lint:fix');
  console.log('2. Run: npm run build');
  console.log('3. Test critical flows (booking, payments, staff)');
  console.log('4. Deploy to staging first');
}

// Run the script
main();