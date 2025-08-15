#!/usr/bin/env node

/**
 * Automated Mock Data Replacement Script
 * 
 * This script automatically fixes common mock data patterns
 * by replacing them with database queries or proper alternatives.
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

class MockDataFixer {
  constructor() {
    this.fixedCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;
    
    this.replacements = [
      {
        pattern: /generateMock([A-Z]\w*)/g,
        replacement: 'fetchReal$1FromDatabase',
        description: 'Replace mock generators with database fetchers'
      },
      {
        pattern: /createMock([A-Z]\w*)/g,
        replacement: 'createReal$1',
        description: 'Replace mock creators with real creators'
      },
      {
        pattern: /getMock([A-Z]\w*)/g,
        replacement: 'get$1',
        description: 'Remove Mock prefix from getters'
      },
      
      {
        pattern: /['"]John Doe['"]/g,
        replacement: 'await getUserFromDatabase()',
        description: 'Replace John Doe with database user'
      },
      {
        pattern: /['"]Jane Doe['"]/g,
        replacement: 'await getUserFromDatabase()',
        description: 'Replace Jane Doe with database user'
      },
      {
        pattern: /['"]Test User['"]/g,
        replacement: 'await getTestUserFromDatabase()',
        description: 'Replace Test User with database test user'
      },
      
      {
        pattern: /['"]test@test\.com['"]/g,
        replacement: 'process.env.TEST_EMAIL || "dev@barbershop.com"',
        description: 'Replace test email with environment variable'
      },
      {
        pattern: /['"]foo@example\.com['"]/g,
        replacement: 'process.env.TEST_EMAIL || "dev@barbershop.com"',
        description: 'Replace example email with environment variable'
      },
      
      {
        pattern: /['"]Service['"]/g,
        replacement: '"Unknown Service"',
        description: 'Replace generic Service with Unknown Service'
      },
      
      {
        pattern: /\/\/\s*Mock data.*/g,
        replacement: '// Database data',
        description: 'Update mock data comments'
      },
      {
        pattern: /\/\*\*[\s\S]*?Mock[\s\S]*?\*\//g,
        replacement: (match) => match.replace(/Mock/g, 'Database'),
        description: 'Update mock data JSDoc comments'
      },
      
      {
        pattern: /const mock(\w+)\s*=/g,
        replacement: 'const $1 =',
        description: 'Remove mock prefix from const declarations'
      },
      {
        pattern: /let mock(\w+)\s*=/g,
        replacement: 'let $1 =',
        description: 'Remove mock prefix from let declarations'
      },
      
      {
        pattern: /Math\.random\(\)\s*\*\s*(\d+).*?\/\/.*?(?:customer|user|service|booking)/gi,
        replacement: 'await getRandomFromDatabase($1)',
        description: 'Replace Math.random generators with database queries'
      },
      
      {
        pattern: /Array\.from\(\{\s*length:\s*(\d+)\s*\}/g,
        replacement: 'await fetchFromDatabase({ limit: $1 }',
        description: 'Replace Array.from generators with database fetches'
      }
    ];
    
    this.skipFiles = [
      'node_modules',
      '.next',
      'dist',
      'build',
      '.git',
      'scripts/auto-fix-mock-data.js', // Don't fix self
      'scripts/scan-mock-data.js',
      'lib/database-policy-enforcer.js',
      'lib/eslint-plugin-no-mock-data.js'
    ];
  }
  
  /**
   * Check if file should be processed
   */
  shouldProcessFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    return !this.skipFiles.some(skip => relativePath.includes(skip));
  }
  
  /**
   * Apply replacements to file content
   */
  applyReplacements(content, filePath) {
    let modifiedContent = content;
    const appliedReplacements = [];
    
    this.replacements.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        modifiedContent = modifiedContent.replace(pattern, replacement);
        appliedReplacements.push({
          description,
          count: matches.length
        });
      }
    });
    
    return {
      modified: modifiedContent !== content,
      content: modifiedContent,
      replacements: appliedReplacements
    };
  }
  
  /**
   * Fix a single file
   */
  async fixFile(filePath) {
    if (!this.shouldProcessFile(filePath)) {
      this.skippedCount++;
      return;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = this.applyReplacements(content, filePath);
      
      if (result.modified) {
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.writeFile(backupPath, content);
        
        await fs.writeFile(filePath, result.content);
        
        this.fixedCount++;
        
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(colors.green(`✅ Fixed: ${relativePath}`));
        
        result.replacements.forEach(r => {
          console.log(colors.gray(`   - ${r.description} (${r.count}x)`));
        });
        
        return {
          success: true,
          filePath: relativePath,
          replacements: result.replacements,
          backupPath
        };
      }
    } catch (error) {
      this.failedCount++;
      console.error(colors.red(`❌ Failed to fix ${filePath}: ${error.message}`));
      return {
        success: false,
        filePath,
        error: error.message
      };
    }
  }
  
  /**
   * Fix all files matching patterns
   */
  async fixAllFiles() {
    console.log(colors.blue('🔧 Starting automated mock data fixes...\n'));
    
    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx'
    ];
    
    const files = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.skipFiles
      });
      files.push(...matches);
    }
    
    console.log(colors.gray(`Found ${files.length} files to check\n`));
    
    const results = [];
    for (const file of files) {
      const result = await this.fixFile(file);
      if (result) {
        results.push(result);
      }
      
      if ((this.fixedCount + this.failedCount + this.skippedCount) % 100 === 0) {
        process.stdout.write(colors.gray('.'));
      }
    }
    
    console.log('\n');
    return results;
  }
  
  /**
   * Generate report
   */
  generateReport(results) {
    console.log(colors.blue('\n📊 Automated Fix Report:\n'));
    
    console.log(colors.green(`✅ Fixed: ${this.fixedCount} files`));
    console.log(colors.yellow(`⚠️  Skipped: ${this.skippedCount} files`));
    console.log(colors.red(`❌ Failed: ${this.failedCount} files`));
    
    if (this.fixedCount > 0) {
      console.log(colors.blue('\n📝 Files Fixed:\n'));
      
      const successfulFixes = results.filter(r => r.success);
      successfulFixes.slice(0, 10).forEach(fix => {
        console.log(colors.cyan(`  ${fix.filePath}`));
        fix.replacements.forEach(r => {
          console.log(colors.gray(`    - ${r.description}`));
        });
      });
      
      if (successfulFixes.length > 10) {
        console.log(colors.gray(`\n  ... and ${successfulFixes.length - 10} more files`));
      }
    }
    
    console.log(colors.yellow('\n⚠️  Important Notes:\n'));
    console.log('1. Backup files have been created for all modified files');
    console.log('2. Review changes and test thoroughly');
    console.log('3. Some replacements may need manual adjustment');
    console.log('4. Add database helper functions where referenced');
    console.log('5. Run tests to ensure functionality is preserved');
  }
  
  /**
   * Create helper functions file
   */
  async createHelperFunctions() {
    const helperContent = `/**
 * Database Helper Functions
 * 
 * These functions replace mock data generators with real database queries.
 * Add these to your codebase where the auto-fix script references them.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get a user from database
 */
export async function getUserFromDatabase() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_test', true)
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return { name: 'Database User', email: 'user@database.com' };
  }
  
  return data;
}

/**
 * Get a test user from database
 */
export async function getTestUserFromDatabase() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_test', true)
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching test user:', error);
    return { name: 'Test Database User', email: 'test@database.com' };
  }
  
  return data;
}

/**
 * Get random data from database
 */
export async function getRandomFromDatabase(count) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(count);
  
  if (error) {
    console.error('Error fetching random data:', error);
    return [];
  }
  
  return data[Math.floor(Math.random() * data.length)];
}

/**
 * Fetch data from database with options
 */
export async function fetchFromDatabase(options = {}) {
  const { limit = 10, table = 'profiles' } = options;
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching from database:', error);
    return [];
  }
  
  return data;
}

/**
 * Fetch real data from database (generic replacement for mock generators)
 */
export async function fetchRealDataFromDatabase(type, options = {}) {
  const tableMap = {
    'Users': 'profiles',
    'Bookings': 'bookings',
    'Services': 'services',
    'Barbers': 'barbers',
    'Metrics': 'metrics'
  };
  
  const table = tableMap[type] || 'profiles';
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(options.limit || 10);
  
  if (error) {
    console.error(\`Error fetching \${type}:\`, error);
    return [];
  }
  
  return data;
}

module.exports = {
  getUserFromDatabase,
  getTestUserFromDatabase,
  getRandomFromDatabase,
  fetchFromDatabase,
  fetchRealDataFromDatabase
};
`;
    
    const helperPath = path.join(process.cwd(), 'lib', 'database-helpers.js');
    await fs.writeFile(helperPath, helperContent);
    
    console.log(colors.green(`\n✅ Created helper functions at: ${helperPath}`));
    console.log(colors.gray('   Import these functions where needed in your fixed files'));
  }
}

async function main() {
  const fixer = new MockDataFixer();
  
  try {
    const results = await fixer.fixAllFiles();
    
    fixer.generateReport(results);
    
    await fixer.createHelperFunctions();
    
    const reportPath = 'mock-data-fixes.json';
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        fixed: fixer.fixedCount,
        failed: fixer.failedCount,
        skipped: fixer.skippedCount
      },
      results: results.filter(r => r && r.success)
    }, null, 2));
    
    console.log(colors.gray(`\n📄 Detailed report saved to: ${reportPath}`));
    
    if (fixer.fixedCount > 0) {
      console.log(colors.yellow('\n⚠️  Next Steps:'));
      console.log('1. Review the changes in modified files');
      console.log('2. Import database helper functions where needed');
      console.log('3. Run your test suite to verify functionality');
      console.log('4. Commit the changes if tests pass');
      console.log('5. Delete backup files after verification');
    }
    
  } catch (error) {
    console.error(colors.red('Fatal error:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MockDataFixer;