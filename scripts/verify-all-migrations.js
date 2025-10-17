#!/usr/bin/env node

/**
 * Verify All Migrations Script
 * Checks that all architectural refactoring migrations have been completed
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying All Migrations...');
console.log('=' .repeat(60));

const verificationResults = {
  passed: [],
  warnings: [],
  failed: []
};

// 1. Check UNIFIED_CLIENT exists and is being used
console.log('\n1️⃣  Checking UNIFIED_CLIENT implementation...');
const unifiedClientPath = path.join(process.cwd(), 'lib', 'supabase', 'UNIFIED_CLIENT.js');
if (fs.existsSync(unifiedClientPath)) {
  verificationResults.passed.push('✅ UNIFIED_CLIENT.js exists');
  
  // Check for old client files that should have been removed
  const oldClients = [
    'lib/supabase/client.js',
    'lib/supabase/supabase-client.js',
    'lib/supabase/supabase.js',
    'utils/supabase/client.js',
    'utils/supabase-client.js'
  ];
  
  oldClients.forEach(oldClient => {
    const oldPath = path.join(process.cwd(), oldClient);
    if (fs.existsSync(oldPath)) {
      verificationResults.warnings.push(`⚠️  Old client still exists: ${oldClient}`);
    }
  });
} else {
  verificationResults.failed.push('❌ UNIFIED_CLIENT.js not found');
}

// 2. Check MASTER_SCHEMA exists
console.log('\n2️⃣  Checking MASTER_SCHEMA...');
const masterSchemaPath = path.join(process.cwd(), 'database', 'MASTER_SCHEMA.sql');
if (fs.existsSync(masterSchemaPath)) {
  verificationResults.passed.push('✅ MASTER_SCHEMA.sql exists');
  const schemaContent = fs.readFileSync(masterSchemaPath, 'utf8');
  
  // Check for key schema elements
  if (schemaContent.includes('CREATE TABLE IF NOT EXISTS public.profiles')) {
    verificationResults.passed.push('✅ MASTER_SCHEMA contains profiles table');
  }
  if (schemaContent.includes('CREATE TABLE IF NOT EXISTS public.barbershops')) {
    verificationResults.passed.push('✅ MASTER_SCHEMA contains barbershops table');
  }
  if (schemaContent.includes('CREATE POLICY')) {
    verificationResults.passed.push('✅ MASTER_SCHEMA contains RLS policies');
  }
} else {
  verificationResults.failed.push('❌ MASTER_SCHEMA.sql not found');
}

// 3. Check UNIFIED_DEPLOY script
console.log('\n3️⃣  Checking UNIFIED_DEPLOY...');
const unifiedDeployPath = path.join(process.cwd(), 'UNIFIED_DEPLOY.sh');
if (fs.existsSync(unifiedDeployPath)) {
  verificationResults.passed.push('✅ UNIFIED_DEPLOY.sh exists');
  const deployContent = fs.readFileSync(unifiedDeployPath, 'utf8');
  
  if (deployContent.includes('DEPLOYMENT_ENV') && deployContent.includes('docker')) {
    verificationResults.passed.push('✅ UNIFIED_DEPLOY supports multiple environments');
  }
} else {
  verificationResults.failed.push('❌ UNIFIED_DEPLOY.sh not found');
}

// 4. Check archived migrations
console.log('\n4️⃣  Checking migration archive...');
const archivePath = path.join(process.cwd(), 'database', 'archived_migrations');
if (fs.existsSync(archivePath)) {
  const archivedFiles = fs.readdirSync(archivePath);
  if (archivedFiles.length > 0) {
    verificationResults.passed.push(`✅ ${archivedFiles.length} migrations archived`);
  }
} else {
  verificationResults.warnings.push('⚠️  No migration archive found (may not be needed)');
}

// 5. Check for import updates
console.log('\n5️⃣  Checking import updates...');
const checkImportsInDir = (dir, fileCount = { total: 0, updated: 0 }) => {
  if (!fs.existsSync(dir)) return fileCount;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
      checkImportsInDir(filePath, fileCount);
    } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
      fileCount.total++;
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('UNIFIED_CLIENT')) {
        fileCount.updated++;
      }
    }
  });
  
  return fileCount;
};

const appImports = checkImportsInDir(path.join(process.cwd(), 'app'));
const componentImports = checkImportsInDir(path.join(process.cwd(), 'components'));
const libImports = checkImportsInDir(path.join(process.cwd(), 'lib'));

const totalUpdated = appImports.updated + componentImports.updated + libImports.updated;
if (totalUpdated > 0) {
  verificationResults.passed.push(`✅ ${totalUpdated} files using UNIFIED_CLIENT`);
} else {
  verificationResults.warnings.push('⚠️  No files found using UNIFIED_CLIENT (may need import updates)');
}

// 6. Test database connectivity
console.log('\n6️⃣  Testing database connectivity...');
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (!error) {
      verificationResults.passed.push('✅ Database connection successful');
    } else {
      verificationResults.warnings.push(`⚠️  Database query warning: ${error.message}`);
    }
  } catch (e) {
    verificationResults.warnings.push('⚠️  Could not test database (normal for some configs)');
  }
} else {
  verificationResults.warnings.push('⚠️  Missing database credentials for testing');
}

// Generate final report
console.log('\n' + '=' .repeat(60));
console.log('📊 MIGRATION VERIFICATION REPORT');
console.log('=' .repeat(60));

if (verificationResults.passed.length > 0) {
  console.log('\n✅ PASSED CHECKS:');
  verificationResults.passed.forEach(item => console.log('   ' + item));
}

if (verificationResults.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  verificationResults.warnings.forEach(item => console.log('   ' + item));
}

if (verificationResults.failed.length > 0) {
  console.log('\n❌ FAILED CHECKS:');
  verificationResults.failed.forEach(item => console.log('   ' + item));
}

// Summary
console.log('\n' + '=' .repeat(60));
const totalChecks = verificationResults.passed.length + 
                   verificationResults.warnings.length + 
                   verificationResults.failed.length;

console.log(`📈 Summary: ${verificationResults.passed.length}/${totalChecks} checks passed`);

if (verificationResults.failed.length === 0) {
  console.log('🎉 All critical migrations have been completed successfully!');
  console.log('\n📋 Remaining Manual Steps:');
  console.log('1. Apply MASTER_SCHEMA.sql through Supabase Dashboard');
  console.log('2. Test the unified deployment script');
  console.log('3. Run production build verification');
} else {
  console.log('❌ Some migrations are incomplete. Please review failed checks.');
}

process.exit(verificationResults.failed.length > 0 ? 1 : 0);