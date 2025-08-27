#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Checks for hard-coded values and production configuration issues
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Simple color utilities without external dependencies
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
}

const chalk = {
  red: (text) => `${colors.red}${text}${colors.reset}`,
  green: (text) => `${colors.green}${text}${colors.reset}`,
  yellow: (text) => `${colors.yellow}${text}${colors.reset}`,
  blue: (text) => `${colors.blue}${text}${colors.reset}`,
  cyan: (text) => `${colors.cyan}${text}${colors.reset}`,
  gray: (text) => `${colors.gray}${text}${colors.reset}`,
  white: (text) => `${colors.white}${text}${colors.reset}`,
  bold: {
    red: (text) => `${colors.bold}${colors.red}${text}${colors.reset}`,
    green: (text) => `${colors.bold}${colors.green}${text}${colors.reset}`,
    yellow: (text) => `${colors.bold}${colors.yellow}${text}${colors.reset}`,
    cyan: (text) => `${colors.bold}${colors.cyan}${text}${colors.reset}`,
    white: (text) => `${colors.bold}${colors.white}${text}${colors.reset}`
  }
}
const rootDir = path.join(__dirname, '..')

class ProductionReadinessChecker {
  constructor() {
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  async checkEnvironmentFile() {
    )
    
    try {
      // Check if production template exists
      await fs.access(path.join(rootDir, '.env.production.template'))
      this.passed.push('✅ Production environment template exists')
    } catch {
      this.issues.push('❌ Missing .env.production.template file')
    }

    // Check if .env.production exists
    try {
      await fs.access(path.join(rootDir, '.env.production'))
      this.passed.push('✅ Production environment file exists')
      
      // Check for required variables
      const envContent = await fs.readFile(path.join(rootDir, '.env.production'), 'utf-8')
      const requiredVars = [
        'NODE_ENV',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ENCRYPTION_KEY',
        'ENCRYPTION_SALT'
      ]
      
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`) || envContent.includes(`${varName}=placeholder`)) {
          this.issues.push(`❌ ${varName} not properly configured`)
        } else {
          this.passed.push(`✅ ${varName} is configured`)
        }
      }
    } catch {
      this.warnings.push('⚠️  No .env.production file found - create one from template')
    }
  }

  async checkForHardcodedValues() {
    )
    
    const patterns = [
      {
        name: 'Localhost URLs',
        pattern: /localhost:\d+|127\.0\.0\.1/g,
        exclude: ['.env', 'config', 'README', '.md', 'test', 'spec', 'dev-tools']
      },
      {
        name: 'Test emails',
        pattern: /@test\.com|@example\.com|@demo\.com/g,
        exclude: ['test', 'spec', '.test.', '.spec.', 'dev-tools']
      },
      {
        name: 'Hard-coded UUIDs',
        pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
        exclude: ['migration', 'seed', 'test', 'dev-tools']
      },
      {
        name: 'Test/Demo shop names',
        pattern: /Premium Cuts|Elite Barbershop|Test Shop|Demo Shop/g,
        exclude: ['seed', 'migration', 'test', 'dev-tools']
      }
    ]

    for (const check of patterns) {
      const files = await this.findFiles(rootDir, ['.js', '.jsx', '.ts', '.tsx'])
      let found = false
      
      for (const file of files) {
        // Skip excluded patterns
        if (check.exclude.some(exc => file.includes(exc))) continue
        
        const content = await fs.readFile(file, 'utf-8')
        const matches = content.match(check.pattern)
        
        if (matches) {
          found = true
          const relPath = path.relative(rootDir, file)
          this.warnings.push(`⚠️  ${check.name} found in ${relPath}`)
        }
      }
      
      if (!found) {
        this.passed.push(`✅ No ${check.name.toLowerCase()} in production code`)
      }
    }
  }

  async checkConfigurationService() {
    )
    
    try {
      await fs.access(path.join(rootDir, 'lib/config-service.js'))
      this.passed.push('✅ Configuration service exists')
      
      // Check if it's being used
      const files = await this.findFiles(rootDir, ['.js', '.jsx'])
      let usageCount = 0
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8')
        if (content.includes('config-service') || content.includes('configService')) {
          usageCount++
        }
      }
      
      if (usageCount > 0) {
        this.passed.push(`✅ Configuration service is used in ${usageCount} files`)
      } else {
        this.warnings.push('⚠️  Configuration service exists but not being used')
      }
    } catch {
      this.issues.push('❌ Configuration service not found')
    }
  }

  async checkDatabaseSchema() {
    )
    
    const sqlFiles = await this.findFiles(rootDir, ['.sql'])
    let hasTestData = false
    
    for (const file of sqlFiles) {
      if (file.includes('dev-tools') || file.includes('archive')) continue
      
      const content = await fs.readFile(file, 'utf-8')
      
      // Check for test emails in SQL
      if (content.match(/@test\.com|@example\.com/)) {
        const relPath = path.relative(rootDir, file)
        this.warnings.push(`⚠️  Test data in SQL: ${relPath}`)
        hasTestData = true
      }
      
      // Check for hard-coded UUIDs in INSERT statements
      if (content.match(/INSERT.*'[a-f0-9]{8}-[a-f0-9]{4}/)) {
        const relPath = path.relative(rootDir, file)
        this.warnings.push(`⚠️  Hard-coded UUIDs in SQL: ${relPath}`)
        hasTestData = true
      }
    }
    
    if (!hasTestData) {
      this.passed.push('✅ No test data in SQL files')
    }
  }

  async checkSecuritySettings() {
    )
    
    // Check middleware security
    try {
      const middlewarePath = path.join(rootDir, 'middleware.js')
      const content = await fs.readFile(middlewarePath, 'utf-8')
      
      if (content.includes('Content-Security-Policy')) {
        this.passed.push('✅ CSP headers configured')
      } else {
        this.issues.push('❌ Missing Content Security Policy')
      }
      
      if (content.includes('Strict-Transport-Security')) {
        this.passed.push('✅ HSTS configured')
      } else {
        this.warnings.push('⚠️  HSTS not configured')
      }
    } catch {
      this.issues.push('❌ Middleware security not configured')
    }
    
    // Check for debug endpoints
    const files = await this.findFiles(path.join(rootDir, 'app/api'), ['.js'])
    for (const file of files) {
      const fileName = path.basename(file)
      if (fileName.includes('debug') || fileName.includes('test')) {
        const relPath = path.relative(rootDir, file)
        this.warnings.push(`⚠️  Debug/test endpoint found: ${relPath}`)
      }
    }
  }

  async findFiles(dir, extensions) {
    const files = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        // Skip node_modules and .next
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        
        if (entry.isDirectory()) {
          files.push(...await this.findFiles(fullPath, extensions))
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory not accessible
    }
    
    return files
  }

  printReport() {
    )
    ))
    
    if (this.passed.length > 0) {
      )
      this.passed.forEach(item => )
    }
    
    if (this.warnings.length > 0) {
      )
      this.warnings.forEach(item => )
    }
    
    if (this.issues.length > 0) {
      )
      this.issues.forEach(item => )
    }
    
    ))
    
    const score = Math.round((this.passed.length / (this.passed.length + this.issues.length + this.warnings.length * 0.5)) * 100)
    
    if (this.issues.length === 0) {
      if (this.warnings.length === 0) {
        )
        )
      } else {
        )
        )
      }
    } else {
      )
      )
    }
    
    )
    )
    )
    )
    )
    )
  }
}

// Run the checker
async function main() {
  )
  
  const checker = new ProductionReadinessChecker()
  
  try {
    await checker.checkEnvironmentFile()
    await checker.checkForHardcodedValues()
    await checker.checkConfigurationService()
    await checker.checkDatabaseSchema()
    await checker.checkSecuritySettings()
    
    checker.printReport()
    
    // Exit with error code if critical issues found
    process.exit(checker.issues.length > 0 ? 1 : 0)
  } catch (error) {
    console.error(chalk.red('\n❌ Error running checks:'), error.message)
    process.exit(1)
  }
}

main()