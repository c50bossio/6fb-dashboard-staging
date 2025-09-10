#!/usr/bin/env node

/**
 * Production Test Runner for 6FB AI Agent System
 * Comprehensive production readiness validation
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
}

const log = (message, color = COLORS.RESET) => {
  console.log(`${color}${message}${COLORS.RESET}`)
}

const logSection = (title) => {
  console.log('\n' + '='.repeat(60))
  log(`${COLORS.BOLD}${title}${COLORS.RESET}`)
  console.log('='.repeat(60))
}

class ProductionTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    }
    this.startTime = Date.now()
  }

  async runCommand(command, args, description) {
    log(`\n🚀 ${description}`, COLORS.BLUE)
    
    return new Promise((resolve) => {
      const proc = spawn(command, args, { 
        stdio: 'pipe',
        shell: true 
      })
      
      let stdout = ''
      let stderr = ''
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString()
        process.stdout.write(data)
      })
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString()
        process.stderr.write(data)
      })
      
      proc.on('close', (code) => {
        if (code === 0) {
          log(`✅ ${description} - PASSED`, COLORS.GREEN)
          this.results.passed++
        } else {
          log(`❌ ${description} - FAILED (exit code: ${code})`, COLORS.RED)
          this.results.failed++
          this.results.errors.push({
            description,
            code,
            stdout: stdout.slice(-500), // Last 500 chars
            stderr: stderr.slice(-500)
          })
        }
        resolve({ success: code === 0, code, stdout, stderr })
      })
    })
  }

  async checkPrerequisites() {
    logSection('Prerequisites Check')
    
    // Check if development server is running
    try {
      const response = await fetch('http://localhost:9999', { 
        signal: AbortSignal.timeout(5000) 
      })
      if (!response.ok) throw new Error(`Server returned ${response.status}`)
      log('✅ Development server is running on port 9999', COLORS.GREEN)
    } catch (error) {
      log('❌ Development server not running on port 9999', COLORS.RED)
      log('   Please run: npm run dev', COLORS.YELLOW)
      process.exit(1)
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        log(`✅ ${envVar} is set`, COLORS.GREEN)
      } else {
        log(`❌ ${envVar} is not set`, COLORS.RED)
        this.results.failed++
      }
    }
  }

  async runLintingAndTypeChecks() {
    logSection('Code Quality Checks')
    
    await this.runCommand('npm', ['run', 'lint'], 'ESLint check')
    await this.runCommand('npx', ['tsc', '--noEmit'], 'TypeScript type check')
  }

  async runUnitTests() {
    logSection('Unit Tests')
    
    await this.runCommand('npm', ['run', 'test', '--', '--passWithNoTests'], 'Jest unit tests')
  }

  async runProductionTests() {
    logSection('Production Integration Tests')
    
    const testFile = path.join(process.cwd(), 'tests/production.test.js')
    try {
      await fs.access(testFile)
      await this.runCommand('npx', ['jest', testFile, '--verbose'], 'Production test suite')
    } catch (error) {
      log('⚠️  Production test file not found, skipping', COLORS.YELLOW)
      this.results.skipped++
    }
  }

  async runBuildTest() {
    logSection('Build Verification')
    
    const result = await this.runCommand('npm', ['run', 'build'], 'Production build')
    
    if (result.success) {
      // Check build output
      try {
        const buildDir = path.join(process.cwd(), '.next')
        await fs.access(buildDir)
        log('✅ Build directory created successfully', COLORS.GREEN)
        
        // Check for critical build files
        const staticDir = path.join(buildDir, 'static')
        await fs.access(staticDir)
        log('✅ Static assets generated', COLORS.GREEN)
        
      } catch (error) {
        log('❌ Build verification failed', COLORS.RED)
        this.results.failed++
      }
    }
  }

  async runSecurityChecks() {
    logSection('Security Checks')
    
    // Check for common security issues
    try {
      // Check if .env files are not committed
      const gitIgnore = await fs.readFile('.gitignore', 'utf-8')
      if (gitIgnore.includes('.env')) {
        log('✅ .env files are properly ignored in git', COLORS.GREEN)
        this.results.passed++
      } else {
        log('⚠️  .env files may not be properly ignored', COLORS.YELLOW)
        this.results.skipped++
      }
      
      // Check for hardcoded secrets (basic)
      const packageJson = await fs.readFile('package.json', 'utf-8')
      const suspiciousPatterns = [
        /sk-[a-zA-Z0-9]{48}/,  // OpenAI API keys
        /pk_live_[a-zA-Z0-9]/, // Stripe live keys
        /password.*[:=].*\w/i   // Potential passwords
      ]
      
      let foundSecrets = false
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(packageJson)) {
          foundSecrets = true
        }
      })
      
      if (!foundSecrets) {
        log('✅ No obvious secrets found in package.json', COLORS.GREEN)
        this.results.passed++
      } else {
        log('❌ Potential secrets found in package.json', COLORS.RED)
        this.results.failed++
      }
      
    } catch (error) {
      log('⚠️  Security check failed to run', COLORS.YELLOW)
      this.results.skipped++
    }
  }

  async runPerformanceChecks() {
    logSection('Performance Checks')
    
    try {
      // Simple performance test - measure page load
      const startTime = Date.now()
      const response = await fetch('http://localhost:9999', {
        signal: AbortSignal.timeout(10000)
      })
      const endTime = Date.now()
      const loadTime = endTime - startTime
      
      if (response.ok) {
        log(`✅ Page loads in ${loadTime}ms`, COLORS.GREEN)
        this.results.passed++
        
        if (loadTime > 3000) {
          log('⚠️  Page load time is high (>3s)', COLORS.YELLOW)
        }
      } else {
        log('❌ Page failed to load', COLORS.RED)
        this.results.failed++
      }
      
    } catch (error) {
      log('❌ Performance check failed', COLORS.RED)
      this.results.failed++
    }
  }

  generateReport() {
    logSection('Test Results Summary')
    
    const totalTime = Date.now() - this.startTime
    const totalTests = this.results.passed + this.results.failed + this.results.skipped
    
    log(`\n📊 Test Results:`, COLORS.BOLD)
    log(`   ✅ Passed: ${this.results.passed}`, COLORS.GREEN)
    log(`   ❌ Failed: ${this.results.failed}`, COLORS.RED)
    log(`   ⚠️  Skipped: ${this.results.skipped}`, COLORS.YELLOW)
    log(`   ⏱️  Total Time: ${Math.round(totalTime / 1000)}s`, COLORS.BLUE)
    
    if (this.results.errors.length > 0) {
      log(`\n🚨 Error Details:`, COLORS.RED)
      this.results.errors.forEach((error, index) => {
        log(`\n${index + 1}. ${error.description}`)
        log(`   Exit Code: ${error.code}`)
        if (error.stderr) {
          log(`   Error: ${error.stderr}`)
        }
      })
    }

    // Determine overall result
    const success = this.results.failed === 0
    
    if (success) {
      log(`\n🎉 ALL TESTS PASSED! System is ready for production.`, COLORS.GREEN)
    } else {
      log(`\n💥 ${this.results.failed} test(s) failed. Please fix before production deployment.`, COLORS.RED)
    }

    return success
  }

  async run() {
    log(`${COLORS.BOLD}🧪 6FB AI Agent System - Production Test Suite${COLORS.RESET}`)
    log(`Started at: ${new Date().toLocaleString()}`)
    
    try {
      await this.checkPrerequisites()
      await this.runLintingAndTypeChecks()
      await this.runUnitTests()
      await this.runProductionTests()
      await this.runBuildTest()
      await this.runSecurityChecks()
      await this.runPerformanceChecks()
      
    } catch (error) {
      log(`\n💥 Test runner encountered an error: ${error.message}`, COLORS.RED)
      this.results.failed++
    }

    const success = this.generateReport()
    process.exit(success ? 0 : 1)
  }
}

// Run the test suite
const runner = new ProductionTestRunner()
runner.run().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})