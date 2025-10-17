#!/usr/bin/env node

/**
 * Production Readiness Validator for 6FB AI Agent System
 * Comprehensive validation that system is ready for live shop deployment
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m'
}

const log = (message, color = COLORS.RESET) => {
  console.log(`${color}${message}${COLORS.RESET}`)
}

const logSection = (title, icon = '🔍') => {
  console.log('\n' + '='.repeat(70))
  log(`${COLORS.BOLD}${icon} ${title}${COLORS.RESET}`)
  console.log('='.repeat(70))
}

const logSubsection = (title, icon = '  →') => {
  log(`\n${COLORS.CYAN}${icon} ${title}${COLORS.RESET}`)
}

class ProductionValidator {
  constructor() {
    this.results = {
      criticalChecks: { passed: 0, failed: 0, warnings: 0 },
      integrationTests: { passed: 0, failed: 0, warnings: 0 },
      performanceTests: { passed: 0, failed: 0, warnings: 0 },
      securityChecks: { passed: 0, failed: 0, warnings: 0 },
      aiValidation: { passed: 0, failed: 0, warnings: 0 },
      monitoringChecks: { passed: 0, failed: 0, warnings: 0 },
      issues: []
    }
    this.startTime = Date.now()
  }

  recordResult(category, status, message, details = null) {
    this.results[category][status]++
    
    if (status === 'failed') {
      this.results.issues.push({
        category,
        severity: 'error',
        message,
        details,
        timestamp: new Date().toISOString()
      })
    } else if (status === 'warnings') {
      this.results.issues.push({
        category,
        severity: 'warning',
        message,
        details,
        timestamp: new Date().toISOString()
      })
    }
  }

  async validateEnvironmentConfig() {
    logSection('Environment Configuration Validation', '⚙️')
    
    const requiredEnvVars = {
      critical: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ],
      recommended: [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'SENDGRID_API_KEY'
      ]
    }

    // Check critical environment variables
    logSubsection('Critical Environment Variables')
    for (const envVar of requiredEnvVars.critical) {
      if (process.env[envVar]) {
        log(`✅ ${envVar} is configured`, COLORS.GREEN)
        this.recordResult('criticalChecks', 'passed', `${envVar} configured`)
      } else {
        log(`❌ ${envVar} is missing`, COLORS.RED)
        this.recordResult('criticalChecks', 'failed', `${envVar} is missing`)
      }
    }

    // Check recommended environment variables
    logSubsection('Recommended Environment Variables')
    for (const envVar of requiredEnvVars.recommended) {
      if (process.env[envVar]) {
        log(`✅ ${envVar} is configured`, COLORS.GREEN)
        this.recordResult('criticalChecks', 'passed', `${envVar} configured`)
      } else {
        log(`⚠️  ${envVar} is missing (recommended for full functionality)`, COLORS.YELLOW)
        this.recordResult('criticalChecks', 'warnings', `${envVar} missing (recommended)`)
      }
    }

    // Validate environment file structure
    logSubsection('Environment File Structure')
    try {
      await fs.access('.env.local')
      log(`✅ .env.local file found`, COLORS.GREEN)
      this.recordResult('criticalChecks', 'passed', '.env.local exists')
    } catch {
      try {
        await fs.access('.env')
        log(`✅ .env file found`, COLORS.GREEN)
        this.recordResult('criticalChecks', 'passed', '.env exists')
      } catch {
        log(`❌ No environment file found`, COLORS.RED)
        this.recordResult('criticalChecks', 'failed', 'No environment file found')
      }
    }
  }

  async validateSystemHealth() {
    logSection('System Health Validation', '🏥')

    // Check if development server is accessible
    logSubsection('Development Server')
    try {
      const response = await fetch('http://localhost:9999/api/health', {
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const healthData = await response.json()
        log(`✅ Health endpoint accessible (${response.status})`, COLORS.GREEN)
        this.recordResult('criticalChecks', 'passed', 'Health endpoint accessible')
        
        // Analyze health data
        if (healthData.status === 'ok') {
          log(`✅ System status: ${healthData.status}`, COLORS.GREEN)
          this.recordResult('criticalChecks', 'passed', `System status: ${healthData.status}`)
        } else {
          log(`⚠️  System status: ${healthData.status}`, COLORS.YELLOW)
          this.recordResult('criticalChecks', 'warnings', `System status: ${healthData.status}`)
        }

        // Check service health
        if (healthData.services) {
          Object.entries(healthData.services).forEach(([service, status]) => {
            if (status.status === 'healthy' || status.status === 'configured') {
              log(`  ✅ ${service}: ${status.status}`, COLORS.GREEN)
              this.recordResult('integrationTests', 'passed', `${service} service healthy`)
            } else if (status.status === 'not_configured') {
              log(`  ⚠️  ${service}: ${status.status}`, COLORS.YELLOW)
              this.recordResult('integrationTests', 'warnings', `${service} not configured`)
            } else {
              log(`  ❌ ${service}: ${status.status} - ${status.message || ''}`, COLORS.RED)
              this.recordResult('integrationTests', 'failed', `${service} service error: ${status.message}`)
            }
          })
        }
      } else {
        log(`❌ Health endpoint returned ${response.status}`, COLORS.RED)
        this.recordResult('criticalChecks', 'failed', `Health endpoint error: ${response.status}`)
      }
    } catch (error) {
      log(`❌ Cannot connect to development server: ${error.message}`, COLORS.RED)
      this.recordResult('criticalChecks', 'failed', `Server connection failed: ${error.message}`)
    }
  }

  async validateAIIntegration() {
    logSection('AI Integration Validation', '🤖')

    // Check AI health endpoint
    logSubsection('AI Service Health')
    try {
      const response = await fetch('http://localhost:9999/api/health/ai', {
        signal: AbortSignal.timeout(15000)
      })
      
      if (response.ok) {
        const aiHealth = await response.json()
        log(`✅ AI health endpoint accessible`, COLORS.GREEN)
        this.recordResult('aiValidation', 'passed', 'AI health endpoint accessible')
        
        // Check AI providers
        if (aiHealth.providers) {
          Object.entries(aiHealth.providers).forEach(([provider, status]) => {
            if (status.status === 'configured') {
              log(`  ✅ ${provider}: ${status.message}`, COLORS.GREEN)
              this.recordResult('aiValidation', 'passed', `${provider} configured`)
            } else if (status.status === 'not_configured') {
              log(`  ⚠️  ${provider}: ${status.message}`, COLORS.YELLOW)
              this.recordResult('aiValidation', 'warnings', `${provider} not configured`)
            } else {
              log(`  ❌ ${provider}: ${status.message}`, COLORS.RED)
              this.recordResult('aiValidation', 'failed', `${provider} error`)
            }
          })
        }
      } else {
        log(`❌ AI health check failed: ${response.status}`, COLORS.RED)
        this.recordResult('aiValidation', 'failed', `AI health check failed: ${response.status}`)
      }
    } catch (error) {
      log(`❌ AI health check error: ${error.message}`, COLORS.RED)
      this.recordResult('aiValidation', 'failed', `AI health check error: ${error.message}`)
    }

    // Test AI endpoint functionality
    logSubsection('AI Endpoint Functionality')
    try {
      const testMessage = {
        message: 'This is a production readiness test. Please respond with "System test successful" if you can process this message.',
        agent: 'business_coach'
      }

      const response = await fetch('http://localhost:9999/api/ai/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage),
        signal: AbortSignal.timeout(30000)
      })

      if (response.ok) {
        log(`✅ AI endpoint responding (${response.status})`, COLORS.GREEN)
        this.recordResult('aiValidation', 'passed', 'AI endpoint functional')
      } else if (response.status === 401 || response.status === 403) {
        log(`⚠️  AI endpoint accessible but requires authentication (${response.status})`, COLORS.YELLOW)
        this.recordResult('aiValidation', 'warnings', `AI endpoint auth required: ${response.status}`)
      } else {
        log(`❌ AI endpoint error: ${response.status}`, COLORS.RED)
        this.recordResult('aiValidation', 'failed', `AI endpoint error: ${response.status}`)
      }
    } catch (error) {
      log(`❌ AI endpoint test failed: ${error.message}`, COLORS.RED)
      this.recordResult('aiValidation', 'failed', `AI endpoint test failed: ${error.message}`)
    }
  }

  async validateMonitoringSystem() {
    logSection('Monitoring System Validation', '📊')

    // Check monitoring API
    logSubsection('Monitoring API')
    try {
      const response = await fetch('http://localhost:9999/api/monitoring?type=health', {
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const monitoringData = await response.json()
        log(`✅ Monitoring API accessible`, COLORS.GREEN)
        this.recordResult('monitoringChecks', 'passed', 'Monitoring API accessible')
        
        if (monitoringData.status) {
          log(`✅ Monitoring data available (status: ${monitoringData.status})`, COLORS.GREEN)
          this.recordResult('monitoringChecks', 'passed', `Monitoring data available`)
        }
      } else {
        log(`❌ Monitoring API error: ${response.status}`, COLORS.RED)
        this.recordResult('monitoringChecks', 'failed', `Monitoring API error: ${response.status}`)
      }
    } catch (error) {
      log(`❌ Monitoring API test failed: ${error.message}`, COLORS.RED)
      this.recordResult('monitoringChecks', 'failed', `Monitoring API test failed: ${error.message}`)
    }

    // Check production monitor initialization
    logSubsection('Production Monitor')
    try {
      // Test if production monitor files exist
      await fs.access('lib/production-monitor.js')
      log(`✅ Production monitor module exists`, COLORS.GREEN)
      this.recordResult('monitoringChecks', 'passed', 'Production monitor exists')
      
      await fs.access('database/production-monitoring-schema.sql')
      log(`✅ Monitoring database schema exists`, COLORS.GREEN)
      this.recordResult('monitoringChecks', 'passed', 'Monitoring schema exists')
      
    } catch (error) {
      log(`❌ Production monitor files missing: ${error.message}`, COLORS.RED)
      this.recordResult('monitoringChecks', 'failed', `Monitor files missing: ${error.message}`)
    }

    // Check fallback systems
    logSubsection('Fallback Systems')
    try {
      await fs.access('lib/fallback-systems.js')
      log(`✅ Fallback systems module exists`, COLORS.GREEN)
      this.recordResult('monitoringChecks', 'passed', 'Fallback systems exist')
    } catch (error) {
      log(`❌ Fallback systems missing: ${error.message}`, COLORS.RED)
      this.recordResult('monitoringChecks', 'failed', `Fallback systems missing: ${error.message}`)
    }
  }

  async validatePerformance() {
    logSection('Performance Validation', '⚡')

    const performanceTests = [
      { name: 'Homepage Load', url: '/', maxTime: 3000 },
      { name: 'Health Check', url: '/api/health', maxTime: 2000 },
      { name: 'Monitoring API', url: '/api/monitoring?type=health', maxTime: 5000 }
    ]

    for (const test of performanceTests) {
      logSubsection(test.name)
      const startTime = Date.now()
      
      try {
        const response = await fetch(`http://localhost:9999${test.url}`, {
          signal: AbortSignal.timeout(test.maxTime + 2000)
        })
        
        const duration = Date.now() - startTime
        
        if (duration <= test.maxTime) {
          log(`✅ ${test.name}: ${duration}ms (under ${test.maxTime}ms target)`, COLORS.GREEN)
          this.recordResult('performanceTests', 'passed', `${test.name} performance acceptable: ${duration}ms`)
        } else {
          log(`⚠️  ${test.name}: ${duration}ms (over ${test.maxTime}ms target)`, COLORS.YELLOW)
          this.recordResult('performanceTests', 'warnings', `${test.name} slower than target: ${duration}ms`)
        }
      } catch (error) {
        log(`❌ ${test.name} failed: ${error.message}`, COLORS.RED)
        this.recordResult('performanceTests', 'failed', `${test.name} failed: ${error.message}`)
      }
    }
  }

  async validateSecurity() {
    logSection('Security Validation', '🔒')

    // Check for common security issues
    logSubsection('Environment Security')
    
    // Check .gitignore for sensitive files
    try {
      const gitignore = await fs.readFile('.gitignore', 'utf-8')
      const sensitivePatterns = ['.env', '*.key', '*.pem', 'secrets']
      let securityScore = 0
      
      sensitivePatterns.forEach(pattern => {
        if (gitignore.includes(pattern)) {
          securityScore++
          log(`✅ ${pattern} properly ignored in git`, COLORS.GREEN)
        } else {
          log(`⚠️  ${pattern} not found in .gitignore`, COLORS.YELLOW)
        }
      })
      
      if (securityScore >= 3) {
        this.recordResult('securityChecks', 'passed', 'Git security configuration acceptable')
      } else {
        this.recordResult('securityChecks', 'warnings', 'Git security could be improved')
      }
      
    } catch (error) {
      log(`❌ Cannot read .gitignore: ${error.message}`, COLORS.RED)
      this.recordResult('securityChecks', 'failed', 'Cannot validate git security')
    }

    // Check for hardcoded secrets in key files
    logSubsection('Secret Detection')
    const filesToCheck = ['package.json', 'next.config.js']
    
    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file, 'utf-8')
        const secretPatterns = [
          /sk-[a-zA-Z0-9]{48}/,
          /pk_live_[a-zA-Z0-9]/,
          /password.*[:=].*\w/i,
          /secret.*[:=].*\w/i
        ]
        
        let foundSecrets = false
        secretPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            foundSecrets = true
          }
        })
        
        if (!foundSecrets) {
          log(`✅ No obvious secrets in ${file}`, COLORS.GREEN)
          this.recordResult('securityChecks', 'passed', `No secrets in ${file}`)
        } else {
          log(`❌ Potential secrets found in ${file}`, COLORS.RED)
          this.recordResult('securityChecks', 'failed', `Potential secrets in ${file}`)
        }
      } catch (error) {
        log(`⚠️  Cannot check ${file}: ${error.message}`, COLORS.YELLOW)
        this.recordResult('securityChecks', 'warnings', `Cannot check ${file}`)
      }
    }
  }

  async runProductionTestSuite() {
    logSection('Production Test Suite', '🧪')
    
    try {
      // Run the production test suite
      logSubsection('Jest Production Tests')
      const testResult = await this.runCommand('npm', ['run', 'test:production'], 'Production Jest Tests')
      
      if (testResult.success) {
        log(`✅ Production test suite passed`, COLORS.GREEN)
        this.recordResult('integrationTests', 'passed', 'Production test suite passed')
      } else {
        log(`❌ Production test suite failed`, COLORS.RED)
        this.recordResult('integrationTests', 'failed', 'Production test suite failed')
      }
    } catch (error) {
      log(`⚠️  Production test suite could not be run: ${error.message}`, COLORS.YELLOW)
      this.recordResult('integrationTests', 'warnings', `Test suite not available: ${error.message}`)
    }
  }

  async runCommand(command, args, description) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { 
        stdio: 'pipe',
        shell: true 
      })
      
      let stdout = ''
      let stderr = ''
      
      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      
      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      
      proc.on('close', (code) => {
        resolve({ 
          success: code === 0, 
          code, 
          stdout: stdout.slice(-1000), 
          stderr: stderr.slice(-1000) 
        })
      })
    })
  }

  generateReport() {
    logSection('Production Readiness Report', '📋')
    
    const totalTime = Date.now() - this.startTime
    const categories = Object.keys(this.results).filter(key => key !== 'issues')
    
    // Calculate totals
    let totalPassed = 0
    let totalFailed = 0
    let totalWarnings = 0
    
    categories.forEach(category => {
      if (this.results[category].passed !== undefined) {
        totalPassed += this.results[category].passed
        totalFailed += this.results[category].failed
        totalWarnings += this.results[category].warnings
      }
    })
    
    log(`\n📊 Overall Results:`, COLORS.BOLD)
    log(`   ✅ Passed: ${totalPassed}`, COLORS.GREEN)
    log(`   ❌ Failed: ${totalFailed}`, COLORS.RED)
    log(`   ⚠️  Warnings: ${totalWarnings}`, COLORS.YELLOW)
    log(`   ⏱️  Total Time: ${Math.round(totalTime / 1000)}s`, COLORS.BLUE)
    
    // Category breakdown
    log(`\n📈 Category Breakdown:`, COLORS.BOLD)
    categories.forEach(category => {
      if (this.results[category].passed !== undefined) {
        const { passed, failed, warnings } = this.results[category]
        const total = passed + failed + warnings
        const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        
        if (failed === 0) {
          log(`   ✅ ${categoryName}: ${passed}/${total} passed`, COLORS.GREEN)
        } else {
          log(`   ❌ ${categoryName}: ${passed}/${total} passed, ${failed} failed`, COLORS.RED)
        }
      }
    })
    
    // Critical issues
    const criticalIssues = this.results.issues.filter(issue => issue.severity === 'error')
    if (criticalIssues.length > 0) {
      log(`\n🚨 Critical Issues (${criticalIssues.length}):`, COLORS.RED)
      criticalIssues.forEach((issue, index) => {
        log(`   ${index + 1}. [${issue.category}] ${issue.message}`, COLORS.RED)
      })
    }
    
    // Warnings
    const warnings = this.results.issues.filter(issue => issue.severity === 'warning')
    if (warnings.length > 0) {
      log(`\n⚠️  Warnings (${warnings.length}):`, COLORS.YELLOW)
      warnings.forEach((issue, index) => {
        log(`   ${index + 1}. [${issue.category}] ${issue.message}`, COLORS.YELLOW)
      })
    }
    
    // Final recommendation
    log(`\n🎯 Production Readiness Assessment:`, COLORS.BOLD)
    if (totalFailed === 0 && criticalIssues.length === 0) {
      log(`   🎉 READY FOR PRODUCTION`, COLORS.GREEN)
      log(`   System has passed all critical checks and is ready for live shop deployment.`, COLORS.GREEN)
    } else if (totalFailed <= 2 && criticalIssues.length === 0) {
      log(`   ⚠️  READY WITH CAUTION`, COLORS.YELLOW)
      log(`   System is mostly ready but has some minor issues that should be addressed.`, COLORS.YELLOW)
    } else {
      log(`   ❌ NOT READY FOR PRODUCTION`, COLORS.RED)
      log(`   System has critical issues that must be resolved before deployment.`, COLORS.RED)
    }
    
    return totalFailed === 0 && criticalIssues.length === 0
  }

  async run() {
    log(`${COLORS.BOLD}🚀 6FB AI Agent System - Production Readiness Validator${COLORS.RESET}`)
    log(`${COLORS.DIM}Validating system readiness for live barbershop deployment${COLORS.RESET}`)
    log(`Started at: ${new Date().toLocaleString()}`)
    
    try {
      await this.validateEnvironmentConfig()
      await this.validateSystemHealth()
      await this.validateAIIntegration()
      await this.validateMonitoringSystem()
      await this.validatePerformance()
      await this.validateSecurity()
      await this.runProductionTestSuite()
      
    } catch (error) {
      log(`\n💥 Validator encountered an error: ${error.message}`, COLORS.RED)
      this.recordResult('criticalChecks', 'failed', `Validator error: ${error.message}`)
    }

    const isReady = this.generateReport()
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      isReady,
      results: this.results,
      summary: {
        totalChecks: Object.values(this.results)
          .filter(cat => cat.passed !== undefined)
          .reduce((sum, cat) => sum + cat.passed + cat.failed + cat.warnings, 0),
        passed: Object.values(this.results)
          .filter(cat => cat.passed !== undefined)
          .reduce((sum, cat) => sum + cat.passed, 0),
        failed: Object.values(this.results)
          .filter(cat => cat.passed !== undefined)
          .reduce((sum, cat) => sum + cat.failed, 0),
        warnings: Object.values(this.results)
          .filter(cat => cat.passed !== undefined)
          .reduce((sum, cat) => sum + cat.warnings, 0)
      }
    }
    
    try {
      await fs.writeFile(
        'production-readiness-report.json', 
        JSON.stringify(reportData, null, 2)
      )
      log(`\n📄 Detailed report saved to: production-readiness-report.json`, COLORS.BLUE)
    } catch (error) {
      log(`\n⚠️  Could not save report: ${error.message}`, COLORS.YELLOW)
    }
    
    process.exit(isReady ? 0 : 1)
  }
}

// Run the validator
const validator = new ProductionValidator()
validator.run().catch(error => {
  console.error('Production readiness validation failed:', error)
  process.exit(1)
})