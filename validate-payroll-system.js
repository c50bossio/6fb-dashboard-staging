#!/usr/bin/env node

/**
 * Quick Payroll Export System Validation
 * Checks if all components are properly integrated and functioning
 * 
 * Usage: node validate-payroll-system.js
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

class PayrollSystemValidator {
  constructor() {
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: []
    }
  }

  async validateSystem() {
    log('🔍 Validating Payroll Export System...', 'bold')
    log('=' * 50, 'blue')

    // File structure validation
    await this.validateFileStructure()
    
    // Component validation
    await this.validateComponents()
    
    // Database schema validation
    await this.validateDatabaseSchema()
    
    // API endpoints validation
    await this.validateAPIEndpoints()
    
    // Integration validation
    await this.validateIntegrations()

    // Display results
    this.displayValidationResults()
  }

  async validateFileStructure() {
    log('\n📁 Validating File Structure...', 'yellow')

    const requiredFiles = [
      'services/payroll-export-service.js',
      'services/payroll-email-service.js',
      'components/PayrollExportInterface.js',
      'app/api/payroll/export/route.js',
      'app/api/payroll/schedule/route.js',
      'database/payroll-export-schema.sql'
    ]

    for (const filePath of requiredFiles) {
      try {
        const fullPath = path.join(__dirname, filePath)
        await fs.access(fullPath)
        log(`✅ ${filePath}`, 'green')
        this.validationResults.passed++
      } catch (error) {
        log(`❌ Missing: ${filePath}`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push(`Missing file: ${filePath}`)
      }
    }
  }

  async validateComponents() {
    log('\n⚙️  Validating Components...', 'yellow')

    // Validate Payroll Export Service
    try {
      const serviceContent = await fs.readFile(
        path.join(__dirname, 'services/payroll-export-service.js'),
        'utf-8'
      )

      const requiredMethods = [
        'generatePayrollExport',
        'getPayrollData',
        'calculatePayrollRecords',
        'generatePDFReport',
        'generateExcelReport',
        'generateCSVReport',
        'validateDateRange'
      ]

      let methodsFound = 0
      for (const method of requiredMethods) {
        if (serviceContent.includes(method)) {
          methodsFound++
        }
      }

      if (methodsFound === requiredMethods.length) {
        log('✅ PayrollExportService has all required methods', 'green')
        this.validationResults.passed++
      } else {
        log(`❌ PayrollExportService missing methods (${methodsFound}/${requiredMethods.length})`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push('PayrollExportService incomplete')
      }

    } catch (error) {
      log('❌ Could not validate PayrollExportService', 'red')
      this.validationResults.failed++
      this.validationResults.issues.push('PayrollExportService validation error')
    }

    // Validate Email Service
    try {
      const emailContent = await fs.readFile(
        path.join(__dirname, 'services/payroll-email-service.js'),
        'utf-8'
      )

      const requiredEmailMethods = [
        'sendExportEmail',
        'sendScheduledReport',
        'validateEmailConfig',
        'generateExportEmailTemplate'
      ]

      let emailMethodsFound = 0
      for (const method of requiredEmailMethods) {
        if (emailContent.includes(method)) {
          emailMethodsFound++
        }
      }

      if (emailMethodsFound === requiredEmailMethods.length) {
        log('✅ PayrollEmailService has all required methods', 'green')
        this.validationResults.passed++
      } else {
        log(`❌ PayrollEmailService missing methods (${emailMethodsFound}/${requiredEmailMethods.length})`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push('PayrollEmailService incomplete')
      }

    } catch (error) {
      log('❌ Could not validate PayrollEmailService', 'red')
      this.validationResults.failed++
      this.validationResults.issues.push('PayrollEmailService validation error')
    }

    // Validate React Component
    try {
      const componentContent = await fs.readFile(
        path.join(__dirname, 'components/PayrollExportInterface.js'),
        'utf-8'
      )

      const requiredFeatures = [
        'useState',
        'format selection',
        'date range',
        'staff filter',
        'export generation',
        'schedule management'
      ]

      const featureKeywords = [
        'useState',
        'format',
        'dateRange',
        'staffFilter',
        'generateExport',
        'schedule'
      ]

      let featuresFound = 0
      for (const keyword of featureKeywords) {
        if (componentContent.includes(keyword)) {
          featuresFound++
        }
      }

      if (featuresFound >= featureKeywords.length - 1) { // Allow one missing
        log('✅ PayrollExportInterface has required features', 'green')
        this.validationResults.passed++
      } else {
        log(`❌ PayrollExportInterface missing features (${featuresFound}/${featureKeywords.length})`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push('PayrollExportInterface incomplete')
      }

    } catch (error) {
      log('❌ Could not validate PayrollExportInterface', 'red')
      this.validationResults.failed++
      this.validationResults.issues.push('PayrollExportInterface validation error')
    }
  }

  async validateDatabaseSchema() {
    log('\n🗄️  Validating Database Schema...', 'yellow')

    try {
      const schemaContent = await fs.readFile(
        path.join(__dirname, 'database/payroll-export-schema.sql'),
        'utf-8'
      )

      const requiredTables = [
        'payroll_export_history',
        'payroll_export_schedules',
        'payroll_schedule_executions',
        'payroll_export_templates',
        'payroll_export_permissions',
        'payroll_rate_limits',
        'payroll_notification_log'
      ]

      let tablesFound = 0
      for (const table of requiredTables) {
        if (schemaContent.includes(table)) {
          tablesFound++
        }
      }

      if (tablesFound === requiredTables.length) {
        log(`✅ All ${requiredTables.length} database tables defined`, 'green')
        this.validationResults.passed++
      } else {
        log(`❌ Database schema incomplete (${tablesFound}/${requiredTables.length} tables)`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push('Database schema incomplete')
      }

      // Check for RLS policies
      if (schemaContent.includes('CREATE POLICY') || schemaContent.includes('ENABLE ROW LEVEL SECURITY')) {
        log('✅ Row Level Security policies present', 'green')
        this.validationResults.passed++
      } else {
        log('⚠️  No RLS policies detected', 'yellow')
        this.validationResults.warnings++
        this.validationResults.issues.push('Missing RLS policies (security concern)')
      }

      // Check for indexes
      if (schemaContent.includes('CREATE INDEX')) {
        log('✅ Performance indexes present', 'green')
        this.validationResults.passed++
      } else {
        log('⚠️  No performance indexes detected', 'yellow')
        this.validationResults.warnings++
        this.validationResults.issues.push('Missing performance indexes')
      }

    } catch (error) {
      log('❌ Could not validate database schema', 'red')
      this.validationResults.failed++
      this.validationResults.issues.push('Database schema validation error')
    }
  }

  async validateAPIEndpoints() {
    log('\n🌐 Validating API Endpoints...', 'yellow')

    const endpoints = [
      'app/api/payroll/export/route.js',
      'app/api/payroll/schedule/route.js'
    ]

    for (const endpoint of endpoints) {
      try {
        const endpointContent = await fs.readFile(
          path.join(__dirname, endpoint),
          'utf-8'
        )

        // Check for required HTTP methods
        const requiredMethods = ['POST', 'GET']
        const methodsPresent = requiredMethods.filter(method => 
          endpointContent.includes(`export async function ${method}`)
        )

        if (methodsPresent.length >= 1) {
          log(`✅ ${endpoint} - HTTP methods implemented`, 'green')
          this.validationResults.passed++
        } else {
          log(`❌ ${endpoint} - Missing HTTP methods`, 'red')
          this.validationResults.failed++
          this.validationResults.issues.push(`${endpoint} missing HTTP methods`)
        }

        // Check for authentication
        if (endpointContent.includes('auth') || endpointContent.includes('getUser')) {
          log(`✅ ${endpoint} - Authentication present`, 'green')
          this.validationResults.passed++
        } else {
          log(`⚠️  ${endpoint} - No authentication detected`, 'yellow')
          this.validationResults.warnings++
          this.validationResults.issues.push(`${endpoint} missing authentication`)
        }

        // Check for error handling
        if (endpointContent.includes('try') && endpointContent.includes('catch')) {
          log(`✅ ${endpoint} - Error handling present`, 'green')
          this.validationResults.passed++
        } else {
          log(`❌ ${endpoint} - No error handling`, 'red')
          this.validationResults.failed++
          this.validationResults.issues.push(`${endpoint} missing error handling`)
        }

      } catch (error) {
        log(`❌ Could not validate ${endpoint}`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push(`${endpoint} validation error`)
      }
    }
  }

  async validateIntegrations() {
    log('\n🔗 Validating Integrations...', 'yellow')

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SENDGRID_API_KEY',
      'SENDGRID_FROM_EMAIL'
    ]

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        log(`✅ ${envVar} configured`, 'green')
        this.validationResults.passed++
      } else {
        log(`⚠️  ${envVar} not set`, 'yellow')
        this.validationResults.warnings++
        this.validationResults.issues.push(`Missing environment variable: ${envVar}`)
      }
    }

    // Check for package dependencies
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(__dirname, 'package.json'), 'utf-8')
      )

      const requiredDependencies = [
        'jspdf',
        'jspdf-autotable',
        'exceljs',
        '@sendgrid/mail',
        '@supabase/supabase-js',
        'date-fns'
      ]

      let depsFound = 0
      for (const dep of requiredDependencies) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          depsFound++
        }
      }

      if (depsFound === requiredDependencies.length) {
        log(`✅ All ${requiredDependencies.length} required dependencies present`, 'green')
        this.validationResults.passed++
      } else {
        log(`❌ Missing dependencies (${depsFound}/${requiredDependencies.length})`, 'red')
        this.validationResults.failed++
        this.validationResults.issues.push('Missing package dependencies')
      }

    } catch (error) {
      log('❌ Could not validate package dependencies', 'red')
      this.validationResults.failed++
      this.validationResults.issues.push('Package.json validation error')
    }

    // Check integration with existing services
    const integrationFiles = [
      'lib/financial-service.js',
      'lib/staff-service.js',
      'lib/supabase-client.js'
    ]

    for (const file of integrationFiles) {
      try {
        await fs.access(path.join(__dirname, file))
        log(`✅ Integration point exists: ${file}`, 'green')
        this.validationResults.passed++
      } catch (error) {
        log(`⚠️  Integration point missing: ${file}`, 'yellow')
        this.validationResults.warnings++
        this.validationResults.issues.push(`Missing integration: ${file}`)
      }
    }
  }

  displayValidationResults() {
    log('\n📊 Validation Results', 'bold')
    log('=' * 50, 'blue')

    log(`✅ Passed: ${this.validationResults.passed}`, 'green')
    log(`❌ Failed: ${this.validationResults.failed}`, 'red')
    log(`⚠️  Warnings: ${this.validationResults.warnings}`, 'yellow')

    const total = this.validationResults.passed + this.validationResults.failed + this.validationResults.warnings
    const passRate = total > 0 ? (this.validationResults.passed / total * 100).toFixed(1) : 0

    log(`\n📈 Success Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red')

    if (this.validationResults.issues.length > 0) {
      log('\n📋 Issues Found:', 'yellow')
      this.validationResults.issues.forEach((issue, index) => {
        log(`   ${index + 1}. ${issue}`, issue.includes('Missing') ? 'yellow' : 'red')
      })
    }

    log('\n🚀 Deployment Readiness Assessment:', 'bold')
    
    if (this.validationResults.failed === 0) {
      if (this.validationResults.warnings === 0) {
        log('🎉 READY FOR PRODUCTION - All validations passed!', 'green')
      } else {
        log('✅ READY WITH WARNINGS - Consider addressing warnings before production', 'yellow')
      }
    } else {
      log('❌ NOT READY - Please fix critical issues before deployment', 'red')
    }

    log('\n📚 Next Steps:', 'bold')
    if (this.validationResults.failed > 0) {
      log('1. Fix all failed validation items', 'red')
      log('2. Re-run validation: node validate-payroll-system.js', 'blue')
      log('3. Run integration tests: node test-payroll-export-integration.js', 'blue')
    } else {
      log('1. Run integration tests: node test-payroll-export-integration.js', 'blue')
      log('2. Deploy database schema to production', 'blue')
      log('3. Deploy application with payroll export features', 'blue')
    }

    log('=' * 50, 'blue')
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PayrollSystemValidator()
  await validator.validateSystem()
  process.exit(validator.validationResults.failed > 0 ? 1 : 0)
}

export default PayrollSystemValidator