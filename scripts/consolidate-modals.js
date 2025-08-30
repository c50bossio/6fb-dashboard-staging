#!/usr/bin/env node

/**
 * Modal Consolidation Script
 * Finds modals not using the base Modal component and creates a report
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Analyzing Modal Component Usage...');

const COMPONENT_ROOT = '/Users/bossio/6FB AI Agent System/components';
const modalFiles = [];
const modalUsageAnalysis = [];

// Find all modal files
const findModalFiles = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      findModalFiles(filePath);
    } else if (file.toLowerCase().includes('modal') && file.match(/\.(js|jsx|ts|tsx)$/)) {
      modalFiles.push(filePath);
    }
  });
};

findModalFiles(COMPONENT_ROOT);

console.log(`📋 Found ${modalFiles.length} modal files`);

// Analyze each modal file
modalFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace('/Users/bossio/6FB AI Agent System/', '');
  
  const analysis = {
    file: relativePath,
    usesBaseModal: content.includes('from \'@/components/ui/Modal\'') || content.includes('from "../ui/Modal"') || content.includes('from \'../ui/Modal\''),
    usesHeadlessUI: content.includes('@headlessui/react'),
    usesCustomModal: content.includes('className.*modal') && !content.includes('from \'@/components/ui/Modal\''),
    size: content.length,
    hasProperAria: content.includes('aria-'),
    hasEscapeHandler: content.includes('Escape'),
    hasBackdropClose: content.includes('backdrop') || content.includes('overlay')
  };
  
  modalUsageAnalysis.push(analysis);
});

// Generate consolidation report
console.log('\n📊 Modal Analysis Report:');
console.log('=' .repeat(60));

const usingBaseModal = modalUsageAnalysis.filter(m => m.usesBaseModal);
const usingHeadlessUI = modalUsageAnalysis.filter(m => m.usesHeadlessUI);
const usingCustom = modalUsageAnalysis.filter(m => m.usesCustomModal);

console.log(`✅ Using Base Modal: ${usingBaseModal.length} files`);
console.log(`⚠️  Using HeadlessUI: ${usingHeadlessUI.length} files`);
console.log(`🚨 Using Custom Modal: ${usingCustom.length} files`);

console.log('\n🔄 Files to Migrate:');
const filesToMigrate = modalUsageAnalysis.filter(m => !m.usesBaseModal);
filesToMigrate.forEach(modal => {
  console.log(`  - ${modal.file} (${modal.usesHeadlessUI ? 'HeadlessUI' : 'Custom'})`);
});

// Create migration script for the most problematic ones
const migrationScript = [];
migrationScript.push('// Modal Migration Script - Convert to Base Modal');
migrationScript.push('// Files that need to be updated:');
migrationScript.push('');

filesToMigrate.slice(0, 5).forEach(modal => {
  migrationScript.push(`// ${modal.file}`);
  migrationScript.push(`// - Uses HeadlessUI: ${modal.usesHeadlessUI}`);
  migrationScript.push(`// - Size: ${modal.size} bytes`);
  migrationScript.push(`// - Has proper ARIA: ${modal.hasProperAria}`);
  migrationScript.push('');
});

fs.writeFileSync(
  path.join('/Users/bossio/6FB AI Agent System/scripts/', 'modal-migration-plan.md'),
  migrationScript.join('\n')
);

console.log('\n✅ Analysis complete!');
console.log('📄 Migration plan created: scripts/modal-migration-plan.md');
console.log(`🎯 Priority: Migrate ${Math.min(filesToMigrate.length, 5)} largest custom modals first`);