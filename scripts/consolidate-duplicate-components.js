#!/usr/bin/env node

/**
 * Component Consolidation Script
 * Removes duplicate components and updates all imports to use the best version
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Starting Component Consolidation...');

const COMPONENT_ROOT = '/Users/bossio/6FB AI Agent System/components';
const APP_ROOT = '/Users/bossio/6FB AI Agent System/app';

// Step 1: Remove duplicate Customer Intelligence Dashboard (keep optimized version)
const duplicateDashboard = path.join(COMPONENT_ROOT, 'customers/CustomerIntelligenceDashboard.js');
console.log('📁 Removing duplicate CustomerIntelligenceDashboard...');

if (fs.existsSync(duplicateDashboard)) {
  fs.unlinkSync(duplicateDashboard);
  console.log('✅ Removed: CustomerIntelligenceDashboard.js');
}

// Step 2: Update index.js to export optimized version as main
const indexPath = path.join(COMPONENT_ROOT, 'customers/index.js');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Replace exports to use optimized version as the main export
  indexContent = indexContent.replace(
    /export \{ default as CustomerIntelligenceDashboard \} from '\.\/CustomerIntelligenceDashboard'/g,
    'export { default as CustomerIntelligenceDashboard } from \'./CustomerIntelligenceDashboardOptimized\''
  );
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated: customers/index.js exports');
}

// Step 3: Update all imports across the codebase
const updateImportsInDir = (dirPath) => {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      updateImportsInDir(filePath);
    } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Update direct imports of CustomerIntelligenceDashboardOptimized to use main name
      if (content.includes('CustomerIntelligenceDashboardOptimized')) {
        content = content.replace(/CustomerIntelligenceDashboardOptimized/g, 'CustomerIntelligenceDashboard');
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated imports in: ${filePath.replace('/Users/bossio/6FB AI Agent System/', '')}`);
      }
    }
  });
};

console.log('📝 Updating imports across codebase...');
updateImportsInDir(APP_ROOT);
updateImportsInDir(COMPONENT_ROOT);

console.log('🎉 Component consolidation completed!');
console.log('📊 Summary:');
console.log('  - Removed duplicate CustomerIntelligenceDashboard.js');
console.log('  - Updated index.js exports to use optimized version');
console.log('  - Updated all imports across codebase');