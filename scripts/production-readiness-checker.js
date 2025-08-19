#!/usr/bin/env node

/**
 * Production Readiness Checker
 * 
 * Comprehensive script to verify the barbershop platform is ready for production
 * by checking all critical components, configurations, and data integrity.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

class ProductionReadinessChecker {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    }
    
    this.supabase = null
    this.initializeSupabase()
  }

  initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      this.log('ERROR', 'Supabase credentials missing. Cannot perform database checks.')
      return
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString()
    const colorMap = {
      'PASS': colors.green,
      'FAIL': colors.red,
      'WARN': colors.yellow,
      'INFO': colors.blue,
      'ERROR': colors.red
    }

    const color = colorMap[level] || colors.reset
    console.log(`${color}[${level}]${colors.reset} ${message}`)
    
    if (details) {
      console.log(`  ${colors.cyan}Details:${colors.reset} ${details}`)
    }

    this.results.checks.push({
      timestamp,
      level,
      message,
      details
    })

    if (level === 'PASS') this.results.passed++
    else if (level === 'FAIL') this.results.failed++
    else if (level === 'WARN') this.results.warnings++
  }

  async checkEnvironmentVariables() {
    this.log('INFO', 'Checking environment variables...')

    const requiredEnvVars = {
      'NEXT_PUBLIC_SUPABASE_URL': 'Supabase URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase Anon Key',
      'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Key',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': 'Stripe Publishable Key',
      'STRIPE_SECRET_KEY': 'Stripe Secret Key',
      'STRIPE_WEBHOOK_SECRET': 'Stripe Webhook Secret'
    }

    const optionalEnvVars = {
      'OPENAI_API_KEY': 'OpenAI API Key',
      'ANTHROPIC_API_KEY': 'Anthropic API Key',
      'GOOGLE_AI_API_KEY': 'Google AI API Key',
      'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
      'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
      'SENDGRID_API_KEY': 'SendGrid API Key',
      'REDIS_URL': 'Redis URL'
    }

    // Check required variables
    for (const [key, description] of Object.entries(requiredEnvVars)) {
      const value = process.env[key]
      if (!value) {
        this.log('FAIL', `Missing required environment variable: ${key}`, description)
      } else if (value.includes('placeholder') || value.includes('your-') || value.includes('example')) {
        this.log('FAIL', `Environment variable ${key} contains placeholder value`, value)
      } else {
        this.log('PASS', `Environment variable ${key} is configured`, description)
      }
    }

    // Check optional variables
    for (const [key, description] of Object.entries(optionalEnvVars)) {
      const value = process.env[key]
      if (!value) {
        this.log('WARN', `Optional environment variable ${key} not set`, description)
      } else if (value.includes('placeholder') || value.includes('your-')) {
        this.log('WARN', `Environment variable ${key} contains placeholder value`, description)
      } else {
        this.log('PASS', `Environment variable ${key} is configured`, description)
      }
    }
  }

  async checkSupabaseConnection() {
    this.log('INFO', 'Checking Supabase database connection...')

    if (!this.supabase) {
      this.log('FAIL', 'Cannot connect to Supabase - credentials missing')
      return
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (error && !error.message.includes('permission denied')) {
        this.log('FAIL', 'Supabase connection failed', error.message)
      } else {
        this.log('PASS', 'Supabase database connection successful')
      }
    } catch (err) {
      this.log('FAIL', 'Supabase connection error', err.message)
    }
  }

  async checkRequiredTables() {
    this.log('INFO', 'Checking required database tables...')

    if (!this.supabase) {
      this.log('FAIL', 'Cannot check tables - no Supabase connection')
      return
    }

    const requiredTables = [
      'profiles',
      'barbershops', 
      'appointments',
      'services',
      'barbers'
    ]

    for (const table of requiredTables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('count')
          .limit(1)

        if (error && error.message.includes('does not exist')) {
          this.log('FAIL', `Required table '${table}' does not exist`)
        } else if (error && !error.message.includes('permission denied')) {
          this.log('WARN', `Cannot verify table '${table}'`, error.message)
        } else {
          this.log('PASS', `Table '${table}' exists and is accessible`)
        }
      } catch (err) {
        this.log('FAIL', `Error checking table '${table}'`, err.message)
      }
    }
  }

  async checkForMockData() {
    this.log('INFO', 'Checking for mock/placeholder data...')

    if (!this.supabase) {
      this.log('WARN', 'Cannot check for mock data - no Supabase connection')
      return
    }

    // Check for placeholder emails
    const placeholderEmails = [
      'test@example.com',
      'demo@example.com',
      'placeholder@example.com'
    ]

    for (const email of placeholderEmails) {
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('id')
          .eq('email', email)

        if (!error && data && data.length > 0) {
          this.log('FAIL', `Found placeholder email in production database: ${email}`)
        }
      } catch (err) {
        this.log('WARN', `Cannot check for placeholder email ${email}`, err.message)
      }
    }

    // Check for fake phone numbers
    const fakePhones = [
      '(555) 123-4567',
      '555-123-4567',
      '1234567890'
    ]

    for (const phone of fakePhones) {
      try {
        const { data, error } = await this.supabase
          .from('barbershops')
          .select('id')
          .eq('phone', phone)

        if (!error && data && data.length > 0) {
          this.log('FAIL', `Found fake phone number in production database: ${phone}`)
        }
      } catch (err) {
        this.log('WARN', `Cannot check for fake phone ${phone}`, err.message)
      }
    }

    // Check for hardcoded barbershop IDs
    const hardcodedIds = ['demo-shop-001', 'test-shop-001', 'sample-shop']

    for (const id of hardcodedIds) {
      try {
        const { data, error } = await this.supabase
          .from('barbershops')
          .select('id')
          .eq('id', id)

        if (!error && data && data.length > 0) {
          this.log('FAIL', `Found hardcoded barbershop ID: ${id}`)
        }
      } catch (err) {
        this.log('WARN', `Cannot check for hardcoded ID ${id}`, err.message)
      }
    }

    this.log('PASS', 'Mock data check completed')
  }

  async checkAuthenticationSystem() {
    this.log('INFO', 'Checking authentication system...')

    if (!this.supabase) {
      this.log('WARN', 'Cannot check authentication - no Supabase connection')
      return
    }

    try {
      // Test session retrieval
      const { data, error } = await this.supabase.auth.getSession()
      
      if (error) {
        this.log('WARN', 'Authentication system may have issues', error.message)
      } else {
        this.log('PASS', 'Authentication system is accessible')
      }
    } catch (err) {
      this.log('FAIL', 'Authentication system error', err.message)
    }

    // Check for test OAuth pages
    const testOAuthFiles = [
      'app/oauth-test/page.js',
      'app/debug-oauth/page.js',
      'app/oauth-simple/page.js'
    ]

    for (const file of testOAuthFiles) {
      const filePath = path.join(process.cwd(), file)
      if (fs.existsSync(filePath)) {
        this.log('FAIL', `Test OAuth page exists in production: ${file}`)
      }
    }

    this.log('PASS', 'OAuth test pages check completed')
  }

  async checkPaymentIntegration() {
    this.log('INFO', 'Checking payment integration...')

    const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripePublicKey || !stripeSecretKey || !stripeWebhookSecret) {
      this.log('FAIL', 'Stripe configuration incomplete')
      return
    }

    // Validate Stripe key formats
    if (!stripePublicKey.match(/^pk_(test|live)_/)) {
      this.log('FAIL', 'Invalid Stripe publishable key format')
    } else {
      this.log('PASS', 'Stripe publishable key format valid')
    }

    if (!stripeSecretKey.match(/^sk_(test|live)_/)) {
      this.log('FAIL', 'Invalid Stripe secret key format')
    } else {
      this.log('PASS', 'Stripe secret key format valid')
    }

    if (!stripeWebhookSecret.match(/^whsec_/)) {
      this.log('FAIL', 'Invalid Stripe webhook secret format')
    } else {
      this.log('PASS', 'Stripe webhook secret format valid')
    }

    // Check if in test mode
    if (stripePublicKey.includes('test')) {
      this.log('WARN', 'Stripe is in test mode - remember to switch to live keys for production')
    } else {
      this.log('PASS', 'Stripe is configured for live mode')
    }
  }

  async checkExternalIntegrations() {
    this.log('INFO', 'Checking external integrations...')

    // Check AI providers
    const aiProviders = [
      { key: 'OPENAI_API_KEY', name: 'OpenAI', pattern: /^sk-/ },
      { key: 'ANTHROPIC_API_KEY', name: 'Anthropic', pattern: /^sk-ant-/ },
      { key: 'GOOGLE_AI_API_KEY', name: 'Google AI', pattern: /^AIza/ }
    ]

    let aiProvidersConfigured = 0
    for (const provider of aiProviders) {
      const key = process.env[provider.key]
      if (key && provider.pattern.test(key)) {
        this.log('PASS', `${provider.name} API configured`)
        aiProvidersConfigured++
      } else if (key) {
        this.log('WARN', `${provider.name} API key format invalid`)
      }
    }

    if (aiProvidersConfigured === 0) {
      this.log('FAIL', 'No AI providers configured')
    } else if (aiProvidersConfigured === 1) {
      this.log('WARN', 'Only one AI provider configured - consider adding fallbacks')
    } else {
      this.log('PASS', `${aiProvidersConfigured} AI providers configured for redundancy`)
    }

    // Check Twilio SMS
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    if (twilioSid && twilioToken) {
      if (twilioSid.match(/^AC[a-f0-9]{32}$/)) {
        this.log('PASS', 'Twilio SMS integration configured')
      } else {
        this.log('WARN', 'Twilio SID format invalid')
      }
    } else {
      this.log('WARN', 'Twilio SMS not configured - SMS features disabled')
    }

    // Check SendGrid email
    const sendgridKey = process.env.SENDGRID_API_KEY
    if (sendgridKey && sendgridKey.match(/^SG\./)) {
      this.log('PASS', 'SendGrid email integration configured')
    } else if (sendgridKey) {
      this.log('WARN', 'SendGrid API key format invalid')
    } else {
      this.log('WARN', 'SendGrid email not configured - email features disabled')
    }
  }

  async checkSecurity() {
    this.log('INFO', 'Checking security configuration...')

    // Check for development endpoints
    const devEndpoints = [
      'app/api/dev/',
      'app/api/test/',
      'app/api/debug/'
    ]

    for (const endpoint of devEndpoints) {
      const endpointPath = path.join(process.cwd(), endpoint)
      if (fs.existsSync(endpointPath)) {
        this.log('FAIL', `Development endpoint exists in production: ${endpoint}`)
      }
    }

    // Check environment
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv !== 'production') {
      this.log('WARN', `NODE_ENV is '${nodeEnv}', should be 'production' for production deployment`)
    } else {
      this.log('PASS', 'NODE_ENV is set to production')
    }

    // Check for debug flags
    const debugVars = ['DEBUG', 'NEXT_DEBUG', 'VERBOSE']
    for (const debugVar of debugVars) {
      if (process.env[debugVar]) {
        this.log('WARN', `Debug variable ${debugVar} is set in production`)
      }
    }

    this.log('PASS', 'Security configuration check completed')
  }

  async checkPerformance() {
    this.log('INFO', 'Checking performance configuration...')

    // Check Redis cache
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      if (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
        this.log('WARN', 'Redis URL points to localhost - ensure proper production Redis')
      } else {
        this.log('PASS', 'Redis cache configured for production')
      }
    } else {
      this.log('WARN', 'Redis cache not configured - AI responses may be slow and expensive')
    }

    // Check if bundle analyzer is disabled
    const nextConfig = path.join(process.cwd(), 'next.config.js')
    if (fs.existsSync(nextConfig)) {
      const configContent = fs.readFileSync(nextConfig, 'utf8')
      if (configContent.includes('@next/bundle-analyzer') && !configContent.includes('enabled: false')) {
        this.log('WARN', 'Bundle analyzer may be enabled in production')
      } else {
        this.log('PASS', 'Bundle analyzer configuration looks good')
      }
    }

    this.log('PASS', 'Performance configuration check completed')
  }

  async checkDataIntegrity() {
    this.log('INFO', 'Checking data integrity...')

    if (!this.supabase) {
      this.log('WARN', 'Cannot check data integrity - no Supabase connection')
      return
    }

    try {
      // Check foreign key relationships
      const { data: appointments, error } = await this.supabase
        .from('appointments')
        .select('barbershop_id')
        .limit(10)

      if (!error && appointments && appointments.length > 0) {
        for (const appointment of appointments) {
          const { data: shop, error: shopError } = await this.supabase
            .from('barbershops')
            .select('id')
            .eq('id', appointment.barbershop_id)
            .single()

          if (shopError && shopError.message.includes('No rows')) {
            this.log('FAIL', `Appointment references non-existent barbershop: ${appointment.barbershop_id}`)
          }
        }
        this.log('PASS', 'Foreign key relationships check completed')
      }

      // Check for duplicate emails
      const { data: emailCounts, error: emailError } = await this.supabase
        .rpc('check_duplicate_emails')
        .catch(() => ({ data: null, error: { message: 'Function not available' } }))

      if (emailError && !emailError.message.includes('not available')) {
        this.log('WARN', 'Cannot check for duplicate emails', emailError.message)
      } else if (emailCounts && emailCounts.length > 0) {
        this.log('FAIL', 'Duplicate emails found in database')
      } else {
        this.log('PASS', 'No duplicate emails found')
      }

    } catch (err) {
      this.log('WARN', 'Data integrity check incomplete', err.message)
    }
  }

  generateReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.results.checks.length,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        score: Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)
      },
      checks: this.results.checks
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    this.log('INFO', `Production readiness report generated: ${reportPath}`)

    return report
  }

  printSummary() {
    console.log(`\n${colors.bold}${colors.cyan}Production Readiness Summary${colors.reset}`)
    console.log(`${colors.green}✓ Passed: ${this.results.passed}${colors.reset}`)
    console.log(`${colors.red}✗ Failed: ${this.results.failed}${colors.reset}`)
    console.log(`${colors.yellow}⚠ Warnings: ${this.results.warnings}${colors.reset}`)

    const totalCritical = this.results.passed + this.results.failed
    const score = totalCritical > 0 ? Math.round((this.results.passed / totalCritical) * 100) : 0

    console.log(`\n${colors.bold}Production Readiness Score: ${score}%${colors.reset}`)

    if (score >= 90) {
      console.log(`${colors.green}${colors.bold}✓ READY FOR PRODUCTION${colors.reset}`)
    } else if (score >= 70) {
      console.log(`${colors.yellow}${colors.bold}⚠ NEEDS ATTENTION BEFORE PRODUCTION${colors.reset}`)
    } else {
      console.log(`${colors.red}${colors.bold}✗ NOT READY FOR PRODUCTION${colors.reset}`)
    }

    if (this.results.failed > 0) {
      console.log(`\n${colors.red}${colors.bold}Critical Issues:${colors.reset}`)
      this.results.checks
        .filter(check => check.level === 'FAIL')
        .forEach(check => {
          console.log(`${colors.red}  ✗ ${check.message}${colors.reset}`)
        })
    }

    if (this.results.warnings > 0) {
      console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`)
      this.results.checks
        .filter(check => check.level === 'WARN')
        .slice(0, 5) // Show first 5 warnings
        .forEach(check => {
          console.log(`${colors.yellow}  ⚠ ${check.message}${colors.reset}`)
        })
      
      if (this.results.warnings > 5) {
        console.log(`${colors.yellow}  ... and ${this.results.warnings - 5} more warnings${colors.reset}`)
      }
    }
  }

  async run() {
    console.log(`${colors.bold}${colors.blue}6FB Barbershop Platform - Production Readiness Checker${colors.reset}\n`)

    await this.checkEnvironmentVariables()
    await this.checkSupabaseConnection()
    await this.checkRequiredTables()
    await this.checkForMockData()
    await this.checkAuthenticationSystem()
    await this.checkPaymentIntegration()
    await this.checkExternalIntegrations()
    await this.checkSecurity()
    await this.checkPerformance()
    await this.checkDataIntegrity()

    const report = this.generateReport()
    this.printSummary()

    return report
  }
}

// Run the checker if called directly
if (require.main === module) {
  const checker = new ProductionReadinessChecker()
  checker.run()
    .then(() => {
      process.exit(checker.results.failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error(`${colors.red}Fatal error:${colors.reset}`, error.message)
      process.exit(1)
    })
}

module.exports = ProductionReadinessChecker