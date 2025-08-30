#!/usr/bin/env node

/**
 * Migration Files Cleanup
 * 
 * Since we now have MASTER_SCHEMA.sql as the single source of truth,
 * we can archive the old migration files to reduce clutter.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');

console.log('🗂️  Migration Files Cleanup');
console.log('============================\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No files will be moved\n');
}

// Create archived migrations directory
const archiveDir = path.join(projectRoot, 'database/archived-migrations');
const migrationsDir = path.join(projectRoot, 'database/migrations');

if (!fs.existsSync(migrationsDir)) {
  console.log('⏭️  No migrations directory found - skipping cleanup');
  process.exit(0);
}

const migrationFiles = fs.readdirSync(migrationsDir);
console.log(`📁 Found ${migrationFiles.length} migration files to archive\n`);

if (!dryRun) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log(`📦 Created archive directory: database/archived-migrations\n`);
}

let archivedCount = 0;

for (const file of migrationFiles) {
  const sourcePath = path.join(migrationsDir, file);
  const destPath = path.join(archiveDir, file);
  
  if (fs.statSync(sourcePath).isFile()) {
    if (dryRun) {
      console.log(`📦 WOULD ARCHIVE: ${file}`);
      archivedCount++;
    } else {
      try {
        fs.copyFileSync(sourcePath, destPath);
        fs.unlinkSync(sourcePath);
        console.log(`✅ ARCHIVED: ${file}`);
        archivedCount++;
      } catch (err) {
        console.log(`❌ FAILED to archive ${file}: ${err.message}`);
      }
    }
  }
}

if (!dryRun && archivedCount > 0) {
  // Remove empty migrations directory
  try {
    fs.rmdirSync(migrationsDir);
    console.log(`\n🗑️  Removed empty migrations directory`);
  } catch (err) {
    console.log(`\n⚠️  Could not remove migrations directory: ${err.message}`);
  }
}

console.log('\n📊 Archive Summary');
console.log('==================');
console.log(`Files archived: ${archivedCount}`);

if (!dryRun && archivedCount > 0) {
  console.log(`Archive location: database/archived-migrations`);
}

console.log('\n✅ Migration cleanup complete!');
console.log('\n💡 Note: MASTER_SCHEMA.sql is now the single source of truth for database schema.');