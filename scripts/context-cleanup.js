#!/usr/bin/env node

/**
 * Context Cleanup Script for BookedBarber AI System
 * Optimizes codebase for Claude Code context efficiency
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ContextCleaner {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.aggressive = process.argv.includes('--aggressive');
    this.backupDir = path.join(__dirname, '../.cleanup-backup');
    
    this.stats = {
      filesRemoved: 0,
      filesReorganized: 0,
      sizeReduced: 0,
      contextReduction: 0
    };
  }

  log(message, level = 'info') {
    const prefix = this.dryRun ? '[DRY RUN] ' : '';
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    if (level === 'error') {
      console.error(`🚨 ${prefix}[${timestamp}] ${message}`);
    } else if (level === 'warn') {
      console.warn(`⚠️  ${prefix}[${timestamp}] ${message}`);
    } else if (level === 'success') {
      console.log(`✅ ${prefix}[${timestamp}] ${message}`);
    } else {
      console.log(`📋 ${prefix}[${timestamp}] ${message}`);
    }
  }

  async measureContextBefore() {
    this.log('📊 Measuring context before cleanup...');
    
    try {
      const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.json'];
      const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'coverage'];
      
      let totalFiles = 0;
      let totalSize = 0;

      const countFiles = (dir) => {
        try {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !excludeDirs.includes(item)) {
              countFiles(fullPath);
            } else if (stat.isFile()) {
              const ext = path.extname(item);
              if (extensions.includes(ext)) {
                totalFiles++;
                totalSize += stat.size;
              }
            }
          }
        } catch (err) {
        }
      };

      countFiles('.');
      
      this.beforeStats = { totalFiles, totalSize };
      this.log(`Context files: ${totalFiles}, Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      return { totalFiles, totalSize };
    } catch (error) {
      this.log(`Error measuring context: ${error.message}`, 'error');
      return { totalFiles: 0, totalSize: 0 };
    }
  }

  createBackup() {
    if (this.dryRun) return;
    
    this.log('💾 Creating backup of critical files...');
    
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const criticalFiles = [
        'package.json',
        'next.config.js',
        'docker-compose.yml',
        '.env.local.example',
        'CLAUDE.md'
      ];
      
      for (const file of criticalFiles) {
        if (fs.existsSync(file)) {
          fs.copyFileSync(file, path.join(this.backupDir, file));
        }
      }
      
      this.log('Backup created successfully', 'success');
    } catch (error) {
      this.log(`Backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  removeLogFiles() {
    this.log('🗑️  Removing log files...');
    
    const logPatterns = [
      '*.log',
      '*_output*.log', 
      'build_output*.log',
      '*.tmp',
      '.DS_Store'
    ];
    
    let removed = 0;
    
    for (const pattern of logPatterns) {
      try {
        const command = `find . -maxdepth 2 -name "${pattern}" -type f`;
        const files = execSync(command, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
        
        for (const file of files) {
          if (fs.existsSync(file)) {
            const size = fs.statSync(file).size;
            if (!this.dryRun) {
              fs.unlinkSync(file);
            }
            this.stats.filesRemoved++;
            this.stats.sizeReduced += size;
            removed++;
            this.log(`Removed: ${file} (${(size / 1024).toFixed(1)} KB)`);
          }
        }
      } catch (error) {
      }
    }
    
    this.log(`Removed ${removed} log files`, 'success');
  }

  removeTestDebugFiles() {
    this.log('🧪 Removing test/debug artifacts...');
    
    const testPatterns = [
      'test-*.js',
      'debug-*.js', 
      'manual-*.js',
      'test-*.html',
      'debug-*.html',
      '*-test.js',
      '*-debug.js'
    ];
    
    const excludePaths = [
      'tests/',
      '__tests__/',
      'test/',
      'spec/'
    ];
    
    let removed = 0;
    
    for (const pattern of testPatterns) {
      try {
        const command = `find . -maxdepth 2 -name "${pattern}" -type f`;
        const files = execSync(command, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
        
        for (const file of files) {
          const isLegitTest = excludePaths.some(dir => file.includes(dir));
          if (isLegitTest) continue;
          
          if (fs.existsSync(file)) {
            const size = fs.statSync(file).size;
            if (!this.dryRun) {
              fs.unlinkSync(file);
            }
            this.stats.filesRemoved++;
            this.stats.sizeReduced += size;
            removed++;
            this.log(`Removed: ${file} (${(size / 1024).toFixed(1)} KB)`);
          }
        }
      } catch (error) {
      }
    }
    
    this.log(`Removed ${removed} test/debug files`, 'success');
  }

  removeBackupFiles() {
    this.log('📦 Removing backup and temporary files...');
    
    const backupPatterns = [
      '*.backup-*',
      '*.old.*',
      '*.bak',
      '*~',
      '*.swp',
      '*.swo'
    ];
    
    let removed = 0;
    
    for (const pattern of backupPatterns) {
      try {
        const command = `find . -maxdepth 3 -name "${pattern}" -type f`;
        const files = execSync(command, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
        
        for (const file of files) {
          if (fs.existsSync(file)) {
            const size = fs.statSync(file).size;
            if (!this.dryRun) {
              fs.unlinkSync(file);
            }
            this.stats.filesRemoved++;
            this.stats.sizeReduced += size;
            removed++;
            this.log(`Removed: ${file} (${(size / 1024).toFixed(1)} KB)`);
          }
        }
      } catch (error) {
      }
    }
    
    this.log(`Removed ${removed} backup files`, 'success');
  }

  cleanBuildArtifacts() {
    this.log('🏗️  Cleaning build artifacts...');
    
    const buildDirs = [
      '.next',
      'dist', 
      'build',
      'coverage',
      '.cache',
      '.nyc_output'
    ];
    
    let removed = 0;
    
    for (const dir of buildDirs) {
      if (fs.existsSync(dir)) {
        try {
          const size = this.getDirSize(dir);
          if (!this.dryRun) {
            execSync(`rm -rf "${dir}"`, { stdio: 'ignore' });
          }
          this.stats.sizeReduced += size;
          removed++;
          this.log(`Removed directory: ${dir} (${(size / 1024 / 1024).toFixed(1)} MB)`);
        } catch (error) {
          this.log(`Failed to remove ${dir}: ${error.message}`, 'warn');
        }
      }
    }
    
    this.log(`Removed ${removed} build directories`, 'success');
  }

  detectMassiveFiles() {
    this.log('🔍 Detecting massive files (>1MB) consuming context...');
    
    const massiveFileThreshold = 1024 * 1024; // 1MB
    const excludeDirs = ['node_modules', '.git', '.next', 'dist'];
    const massiveFiles = [];
    
    const scanDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !excludeDirs.includes(item)) {
            scanDirectory(fullPath);
          } else if (stat.isFile() && stat.size > massiveFileThreshold) {
            massiveFiles.push({
              path: fullPath,
              size: stat.size,
              sizeMB: (stat.size / 1024 / 1024).toFixed(2)
            });
          }
        }
      } catch (err) {
        // Ignore permission errors
      }
    };

    scanDirectory('.');
    
    if (massiveFiles.length > 0) {
      this.log(`Found ${massiveFiles.length} massive files consuming context:`, 'warn');
      massiveFiles.forEach(file => {
        this.log(`  📁 ${file.path} (${file.sizeMB} MB)`, 'warn');
      });
      
      // Remove the massive files
      let removed = 0;
      for (const file of massiveFiles) {
        if (this.shouldRemoveMassiveFile(file.path)) {
          if (!this.dryRun) {
            fs.unlinkSync(file.path);
          }
          this.stats.filesRemoved++;
          this.stats.sizeReduced += file.size;
          removed++;
          this.log(`Removed massive file: ${file.path} (${file.sizeMB} MB)`);
        }
      }
      
      this.log(`Removed ${removed} massive files`, 'success');
    } else {
      this.log('No massive files detected', 'success');
    }
  }

  shouldRemoveMassiveFile(filePath) {
    const massiveFilePatterns = [
      /coverage.*\.json$/,
      /eslint-report\.json$/,
      /.*-report\.json$/,
      /.*-results\.json$/,
      /.*analysis.*\.json$/,
      /performance-report\.html$/,
      /.*\.coverage\.json$/
    ];
    
    return massiveFilePatterns.some(pattern => pattern.test(filePath));
  }

  getDirSize(dirPath) {
    let totalSize = 0;
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          totalSize += this.getDirSize(fullPath);
        } else {
          totalSize += stat.size;
        }
      }
    } catch (error) {
    }
    return totalSize;
  }

  organizeTestFiles() {
    if (this.aggressive) {
      this.log('📁 Organizing remaining test files...');
      
      const testDir = path.join('.', '__tests__');
      if (!fs.existsSync(testDir) && !this.dryRun) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      this.log('Test file organization completed', 'success');
    }
  }

  commitChanges() {
    if (this.dryRun) {
      this.log('Would commit changes to git (dry run mode)');
      return;
    }
    
    this.log('📝 Committing cleanup changes to git...');
    
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      
      if (status) {
        execSync('git add .', { stdio: 'ignore' });
        execSync('git commit -m "cleanup: optimize context window - remove artifacts and logs"', { stdio: 'ignore' });
        this.log('Changes committed successfully', 'success');
      } else {
        this.log('No changes to commit');
      }
    } catch (error) {
      this.log(`Git commit failed: ${error.message}`, 'warn');
    }
  }

  async measureContextAfter() {
    this.log('📊 Measuring context after cleanup...');
    
    const afterStats = await this.measureContextBefore();
    
    if (this.beforeStats) {
      const fileReduction = this.beforeStats.totalFiles - afterStats.totalFiles;
      const sizeReduction = this.beforeStats.totalSize - afterStats.totalSize;
      const percentReduction = ((fileReduction / this.beforeStats.totalFiles) * 100).toFixed(1);
      
      this.stats.contextReduction = parseFloat(percentReduction);
      
      this.log(`Context reduction: ${fileReduction} files (${percentReduction}%)`);
      this.log(`Size reduction: ${(sizeReduction / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  generateReport() {
    this.log('📋 Generating cleanup report...');
    
    const report = `
# Context Cleanup Report
Generated: ${new Date().toISOString()}
Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}

## Statistics
- Files removed: ${this.stats.filesRemoved}
- Files reorganized: ${this.stats.filesReorganized} 
- Size reduced: ${(this.stats.sizeReduced / 1024 / 1024).toFixed(2)} MB
- Context reduction: ${this.stats.contextReduction}%

## Actions Performed
- ✅ Log files cleanup
- ✅ Test/debug artifacts removal
- ✅ Backup files cleanup
- ✅ Build artifacts cleanup
${this.aggressive ? '- ✅ Test file organization' : '- ⏭️  Test file organization (skipped)'}
- ✅ Git commit (context reset)

## Context Optimization Impact
Before: ${this.beforeStats?.totalFiles || 'N/A'} files
After: Context window usage reduced by ~${this.stats.contextReduction}%

This cleanup improves Claude Code efficiency by reducing
irrelevant files that consume context window space.
`;

    if (!this.dryRun) {
      fs.writeFileSync('cleanup-report.md', report);
      this.log('Report saved to cleanup-report.md', 'success');
    } else {
      console.log(report);
    }
  }

  async run() {
    console.log('🚀 BookedBarber Context Cleanup Script');
    console.log('=====================================\n');
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }
    
    try {
      await this.measureContextBefore();
      
      if (!this.dryRun) {
        this.createBackup();
      }
      
      this.detectMassiveFiles();
      this.removeLogFiles();
      this.removeTestDebugFiles();
      this.removeBackupFiles();
      this.cleanBuildArtifacts();
      
      if (this.aggressive) {
        this.organizeTestFiles();
      }
      
      this.commitChanges();
      await this.measureContextAfter();
      this.generateReport();
      
      console.log('\n🎉 Context cleanup completed successfully!');
      console.log(`📊 Context efficiency improved by ${this.stats.contextReduction}%`);
      console.log(`💾 ${(this.stats.sizeReduced / 1024 / 1024).toFixed(2)} MB freed`);
      
      if (this.dryRun) {
        console.log('\n💡 Run without --dry-run to apply changes');
      }
      
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const cleaner = new ContextCleaner();
  
  if (process.argv.includes('--help')) {
    console.log(`
BookedBarber Context Cleanup Script

Usage: node scripts/context-cleanup.js [options]

Options:
  --dry-run       Show what would be removed without making changes
  --verbose       Show detailed output
  --aggressive    Include test file reorganization
  --help          Show this help message

Examples:
  node scripts/context-cleanup.js --dry-run     # Preview changes
  node scripts/context-cleanup.js              # Apply cleanup
  node scripts/context-cleanup.js --aggressive # Deep cleanup
`);
    process.exit(0);
  }
  
  cleaner.run().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = ContextCleaner;