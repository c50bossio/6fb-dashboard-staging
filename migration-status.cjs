#!/usr/bin/env node

/**
 * NUCLEAR MIGRATION STATUS CHECKER
 * Tracks progress of shop_id → barbershop_id migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚨 NUCLEAR MIGRATION STATUS: shop_id → barbershop_id');
console.log('='.repeat(60));

try {
  // Count remaining shop_id occurrences
  const shopIdCount = execSync('find . -type f -name "*.js" -o -name "*.sql" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs grep -c "shop_id" 2>/dev/null | wc -l', 
    { encoding: 'utf8', cwd: process.cwd() }).trim();
  
  // Count barbershop_id occurrences  
  const barbershopIdCount = execSync('find . -type f -name "*.js" -o -name "*.sql" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs grep -c "barbershop_id" 2>/dev/null | wc -l',
    { encoding: 'utf8', cwd: process.cwd() }).trim();

  const totalReferences = parseInt(shopIdCount) + parseInt(barbershopIdCount);
  const migrationProgress = totalReferences > 0 ? ((parseInt(barbershopIdCount) / totalReferences) * 100).toFixed(1) : 0;

  console.log(`📊 Current Status:`);
  console.log(`   • shop_id (OLD):      ${shopIdCount} files`);
  console.log(`   • barbershop_id (NEW): ${barbershopIdCount} files`);
  console.log(`   • Migration Progress: ${migrationProgress}%`);
  
  if (parseInt(shopIdCount) === 0) {
    console.log('\n🎉 MIGRATION COMPLETE! No shop_id references found.');
  } else {
    console.log(`\n⚠️  Still ${shopIdCount} files to migrate.`);
    
    // Show top offending files
    console.log('\n📋 Top files still using shop_id:');
    try {
      const offendingFiles = execSync('find . -type f -name "*.js" -o -name "*.sql" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs grep -l "shop_id" 2>/dev/null | head -10',
        { encoding: 'utf8', cwd: process.cwd() }).trim().split('\n');
      
      offendingFiles.forEach(file => {
        if (file) console.log(`   • ${file}`);
      });
    } catch (e) {
      console.log('   (Could not list files)');
    }
  }

} catch (error) {
  console.error('Error checking migration status:', error.message);
}

console.log('\n' + '='.repeat(60));