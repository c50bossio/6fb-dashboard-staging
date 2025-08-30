#!/usr/bin/env node

/**
 * Phase 2 Cleanup: Remove Redundant Files
 * 
 * This script safely removes files that have been replaced by the unified architecture:
 * - Old database clients (replaced by UNIFIED_CLIENT.js)
 * - Old deployment scripts (replaced by UNIFIED_DEPLOY.sh)
 * - Competing schema files (replaced by MASTER_SCHEMA.sql)
 * - Old authentication endpoints (replaced by unified auth API)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to remove (replaced by unified architecture)
const filesToRemove = [
  // Old Supabase clients (replaced by UNIFIED_CLIENT.js)
  'lib/supabase-client.js',
  'lib/supabase-simple.js', 
  'lib/supabase-service.js',
  'lib/supabase/browser-client.js',
  'lib/supabase/server-client.js',
  'services/supabase-service.js',
  
  // Old deployment scripts (replaced by UNIFIED_DEPLOY.sh)
  'deploy-render-cli.sh',
  'deploy-staging.sh',
  'deploy-bookedbarber.sh',
  'deploy-production.sh',
  'deploy-fresh.sh',
  'railway-deploy-commands.sh',
  'vercel-deploy.sh',
  'docker-dev-start.sh.backup',
  
  // Competing schema files (replaced by MASTER_SCHEMA.sql)
  'database/complete-schema.sql',
  'database/supabase-schema.sql',
  'database/init.sql',
  'database/postgresql_init.sql',
  
  // Old auth endpoints (replaced by unified [...auth] endpoint)
  'app/api/auth/callback/route.js',
  'app/auth/server-callback/route.js',
  'app/auth/simple-callback/route.js',
  'app/api/auth/oauth-exchange/route.js',
  'app/api/auth/login-and-redirect/route.js',
  'app/api/auth/secure-login/route.js',
  
  // Old customer endpoints (replaced by unified [...operation] endpoint)  
  'app/api/clients/route.js',
  'app/api/client-care/route.js',
  'app/api/shop/customers/route.js',
  'app/api/customer-segments/route.js',
];

// Directories to clean up
const directoriesToClean = [
  'coder-cloud-deploy', // Multiple old deployment scripts
  'archived', // Archived services  
];

const dryRun = process.argv.includes('--dry-run');

console.log('🧹 Phase 2: Removing Redundant Files');
console.log('=====================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be deleted\n');
}

let removedCount = 0;
let skippedCount = 0;
let backupCount = 0;

// Create backup directory
const backupDir = path.join(projectRoot, 'archived/cleanup-backup-' + Date.now());
if (!dryRun) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📦 Created backup directory: ${path.relative(projectRoot, backupDir)}\n`);
}

function removeFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  SKIP: ${filePath} (doesn't exist)`);
    skippedCount++;
    return;
  }
  
  if (dryRun) {
    console.log(`🗑️  WOULD DELETE: ${filePath}`);
    removedCount++;
    return;
  }
  
  // Create backup copy
  const backupPath = path.join(backupDir, filePath);
  const backupDirPath = path.dirname(backupPath);
  
  try {
    fs.mkdirSync(backupDirPath, { recursive: true });
    fs.copyFileSync(fullPath, backupPath);
    backupCount++;
  } catch (err) {
    console.log(`⚠️  BACKUP FAILED for ${filePath}: ${err.message}`);
  }
  
  // Remove original file
  try {
    fs.unlinkSync(fullPath);
    console.log(`✅ REMOVED: ${filePath}`);
    removedCount++;
  } catch (err) {
    console.log(`❌ FAILED to remove ${filePath}: ${err.message}`);
  }
}

function removeDirectory(dirPath) {
  const fullPath = path.join(projectRoot, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  SKIP: ${dirPath}/ (doesn't exist)`);
    return;
  }
  
  if (dryRun) {
    console.log(`🗑️  WOULD DELETE DIRECTORY: ${dirPath}/`);
    return;
  }
  
  // Create backup of entire directory
  const backupPath = path.join(backupDir, dirPath);
  
  try {
    fs.cpSync(fullPath, backupPath, { recursive: true });
    backupCount++;
  } catch (err) {
    console.log(`⚠️  BACKUP FAILED for ${dirPath}/: ${err.message}`);
  }
  
  // Remove directory
  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`✅ REMOVED DIRECTORY: ${dirPath}/`);
    removedCount++;
  } catch (err) {
    console.log(`❌ FAILED to remove directory ${dirPath}/: ${err.message}`);
  }
}

// Remove individual files
console.log('📄 Removing redundant files...\n');
for (const file of filesToRemove) {
  removeFile(file);
}

console.log('\n📁 Removing redundant directories...\n');
for (const dir of directoriesToClean) {
  removeDirectory(dir);
}

console.log('\n🧹 Cleanup Summary');
console.log('==================');
console.log(`Files processed: ${removedCount + skippedCount}`);
console.log(`Files removed: ${removedCount}`);
console.log(`Files skipped: ${skippedCount}`);
console.log(`Items backed up: ${backupCount}`);

if (!dryRun && backupCount > 0) {
  console.log(`\n💾 Backup location: ${path.relative(projectRoot, backupDir)}`);
  console.log('Files can be restored from backup if needed.');
}

console.log('\n✅ Phase 2 cleanup complete!');
console.log('\n🚀 Next Steps:');
console.log('- Verify system still works: npm run dev');
console.log('- Run tests: npm run test:all');
console.log('- Build check: npm run build');
console.log('- Deploy test: ./UNIFIED_DEPLOY.sh development --dry-run');