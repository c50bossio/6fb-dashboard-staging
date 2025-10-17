#!/usr/bin/env node

/**
 * Mock Data Scanner
 * 
 * This script scans the entire codebase to find and report mock data violations.
 * It helps identify files that still contain mock data patterns.
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

class MockDataScanner {
  constructor() {
    this.violations = [];
    this.scannedFiles = 0;
    this.mockPatterns = [
      /generate(Mock|Fake|Dummy|Test|Sample|Random)(?:Data)?/gi,
      /create(Mock|Fake|Dummy|Test|Sample)(?:Data)?/gi,
      /make(Mock|Fake|Dummy|Test|Sample)(?:Data)?/gi,
      /getMock(?:Data)?/gi,
      /getFake(?:Data)?/gi,
      /getDummy(?:Data)?/gi,
      
      /(?:const|let|var)\s+mock/gi,
      /(?:const|let|var)\s+fake/gi,
      /(?:const|let|var)\s+dummy/gi,
      /(?:const|let|var)\s+sample/gi,
      /(?:const|let|var)\s+testData/gi,
      
      /Customer\s+\d+/g,
      /Test\s+User/gi,
      /John\s+Doe/gi,
      /Jane\s+Doe/gi,
      /test@test\.com/gi,
      /foo@example\.com/gi,
      /Lorem\s+ipsum/gi,
      
      /["']Service["']/g,  // Just "Service" as a string
      /title:\s*["'].*Service["']/g,  // title with just "Service"
      /Array\.from\(\{.*length:/g,  // Array.from with length (common mock pattern)
      /Math\.random\(\).*(?:Customer|User|Product|Service)/gi,
      
      /\[\s*\{[\s\S]*?name:\s*["'](?:Test|Mock|Fake|Dummy)/gi
    ];

    this.ignorePaths = [
      'node_modules',
      '.next',
      '.git',
      'dist',
      'build',
      'coverage',
      '.vercel',
      '*.test.js',
      '*.spec.js',
      '*.test.ts',
      '*.spec.ts',
      '__tests__',
      'scripts/scan-mock-data.js',  // Don't scan self
      'lib/database-policy-enforcer.js',  // Don't scan our enforcer
      'lib/eslint-plugin-no-mock-data.js'  // Don't scan our plugin
    ];
  }

  /**
   * Check if a file should be scanned
   */
  shouldScanFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    return !this.ignorePaths.some(ignorePath => {
      if (ignorePath.includes('*')) {
        return relativePath.includes(ignorePath.replace('*', ''));
      }
      return relativePath.includes(ignorePath);
    });
  }

  /**
   * Scan a single file for mock data patterns
   */
  async scanFile(filePath) {
    if (!this.shouldScanFile(filePath)) {
      return;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const violations = [];
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        this.mockPatterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            violations.push({
              file: filePath,
              line: lineIndex + 1,
              pattern: pattern.source,
              match: matches[0],
              context: line.trim().substring(0, 100)
            });
          }
        });
      });

      if (violations.length > 0) {
        this.violations.push(...violations);
      }

      this.scannedFiles++;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  /**
   * Scan all JavaScript/TypeScript files in the project
   */
  async scanProject() {
    );

    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx'
    ];

    const files = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        ignore: this.ignorePaths
      });
      files.push(...matches);
    }

    );

    for (const file of files) {
      await this.scanFile(file);
      
      if (this.scannedFiles % 50 === 0) {
        process.stdout.write(colors.gray('.'));
      }
    }

  }

  /**
   * Group violations by file
   */
  groupViolationsByFile() {
    const grouped = {};
    
    this.violations.forEach(violation => {
      if (!grouped[violation.file]) {
        grouped[violation.file] = [];
      }
      grouped[violation.file].push(violation);
    });

    return grouped;
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    if (this.violations.length === 0) {
      );
      );
      return;
    }

    );

    const groupedViolations = this.groupViolationsByFile();
    const fileCount = Object.keys(groupedViolations).length;

    );

    const sortedFiles = Object.entries(groupedViolations)
      .sort((a, b) => b[1].length - a[1].length);

    sortedFiles.forEach(([file, violations]) => {
      const relativePath = path.relative(process.cwd(), file);
       + colors.gray(` (${violations.length} violations)`));
      
      violations.slice(0, 3).forEach(v => {
         + colors.red(` ${v.match}`));
        );
      });

      if (violations.length > 3) {
        );
      }
    });

    );
    
    const patternCounts = {};
    this.violations.forEach(v => {
      const pattern = v.match;
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    const sortedPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedPatterns.forEach(([pattern, count]) => {
       + ` "${pattern}"`);
    });

    );

  }

  /**
   * Generate JSON report for CI/CD
   */
  async generateJsonReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: this.violations.length,
        filesScanned: this.scannedFiles,
        filesWithViolations: Object.keys(this.groupViolationsByFile()).length
      },
      violations: this.violations,
      violationsByFile: this.groupViolationsByFile()
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    );
  }

  /**
   * Generate fix script
   */
  async generateFixScript(outputPath) {
    const fixes = [];
    const groupedViolations = this.groupViolationsByFile();

    Object.entries(groupedViolations).forEach(([file, violations]) => {
      const relativePath = path.relative(process.cwd(), file);
      
      fixes.push(`# File: ${relativePath}`);
      fixes.push(`# Violations: ${violations.length}\n`);
      
      violations.forEach(v => {
        if (v.match.includes('Service')) {
          fixes.push(`# Line ${v.line}: Replace "Service" with actual service name`);
        } else if (v.match.includes('Customer')) {
          fixes.push(`# Line ${v.line}: Replace mock customer with database query`);
        } else if (v.match.includes('generate') || v.match.includes('create')) {
          fixes.push(`# Line ${v.line}: Replace generator function with database fetch`);
        }
      });
      
      fixes.push('');
    });

    const script = `#!/bin/bash
# Mock Data Fix Script
# Generated: ${new Date().toISOString()}
# 
# This script contains suggestions for fixing mock data violations.
# Review and apply fixes manually.

${fixes.join('\n')}

echo "Review the suggestions above and apply fixes manually."
echo "Use the database seed scripts for test data instead of mock generators."
`;

    await fs.writeFile(outputPath, script);
    await fs.chmod(outputPath, '755');
    );
  }
}

async function main() {
  const scanner = new MockDataScanner();
  
  try {
    await scanner.scanProject();
    scanner.generateReport();
    
    if (process.argv.includes('--json')) {
      await scanner.generateJsonReport('mock-data-report.json');
    }
    
    if (process.argv.includes('--fix-script')) {
      await scanner.generateFixScript('fix-mock-data.sh');
    }

    if (scanner.violations.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(colors.red('Error during scan:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MockDataScanner;