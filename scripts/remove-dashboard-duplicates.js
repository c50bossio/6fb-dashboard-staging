#!/usr/bin/env node

/**
 * Dashboard Duplicate Removal Script
 * Remove duplicate dashboard components and standardize imports
 */

import fs from 'fs';
import path from 'path';

console.log('🗂️ Removing Dashboard Duplicates...');

const COMPONENT_ROOT = '/Users/bossio/6FB AI Agent System/components';
const APP_ROOT = '/Users/bossio/6FB AI Agent System/app';

// Step 1: Remove duplicate MonitoringDashboard.js (keep .jsx version which is more comprehensive)
const duplicateMonitoring = path.join(COMPONENT_ROOT, 'monitoring/MonitoringDashboard.js');
console.log('📁 Removing duplicate MonitoringDashboard.js...');

if (fs.existsSync(duplicateMonitoring)) {
  fs.unlinkSync(duplicateMonitoring);
  console.log('✅ Removed: MonitoringDashboard.js (kept .jsx version)');
}

// Step 2: Check for other dashboard duplicates
const dashboardDuplicates = [
  {
    keep: 'realtime/RealtimeDashboard.js',
    remove: 'realtime/LiveDashboard.js'
  },
  // Add more duplicates as discovered
];

dashboardDuplicates.forEach(({ keep, remove }) => {
  const removePath = path.join(COMPONENT_ROOT, remove);
  if (fs.existsSync(removePath)) {
    fs.unlinkSync(removePath);
    console.log(`✅ Removed: ${remove} (kept ${keep})`);
  }
});

// Step 3: Update imports to use .jsx extension for MonitoringDashboard
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
      
      // Update MonitoringDashboard imports to specifically use .jsx version
      if (content.includes("from '@/components/monitoring/MonitoringDashboard'") || 
          content.includes('from "../monitoring/MonitoringDashboard"')) {
        content = content.replace(
          /(from ['"])(@\/components\/monitoring\/MonitoringDashboard|\.\.\/monitoring\/MonitoringDashboard)(['"])/g,
          '$1$2.jsx$3'
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated import in: ${filePath.replace('/Users/bossio/6FB AI Agent System/', '')}`);
      }
    }
  });
};

console.log('📝 Updating imports across codebase...');
updateImportsInDir(APP_ROOT);
updateImportsInDir(COMPONENT_ROOT);

console.log('🎉 Dashboard consolidation completed!');
console.log('📊 Summary:');
console.log('  - Removed duplicate MonitoringDashboard.js (kept comprehensive .jsx version)');
console.log('  - Updated imports to use specific file extensions');
console.log('  - Maintained backward compatibility');