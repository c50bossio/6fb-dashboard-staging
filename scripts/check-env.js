#!/usr/bin/env node

/**
 * Environment Variable Checker
 * Verifies all required environment variables are set
 */

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(message, color = 'reset') {
  
}

const examplePath = path.join(__dirname, '..', '.env.local.example')
const envPath = path.join(__dirname, '..', '.env.local')

const requiredVars = {
  core: [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_API_URL',
  ],
  database: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  authentication: [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ],
  payments: [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
  ai: [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
  ],
  monitoring: [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
  ],
  notifications: [
    'NOVU_API_KEY',
    'NEXT_PUBLIC_NOVU_APP_IDENTIFIER',
  ],
  realtime: [
    'PUSHER_APP_ID',
    'NEXT_PUBLIC_PUSHER_KEY',
    'PUSHER_SECRET',
    'NEXT_PUBLIC_PUSHER_CLUSTER',
  ],
  analytics: [
    'NEXT_PUBLIC_POSTHOG_KEY',
  ],
}

const optionalVars = [
  'NEXT_PUBLIC_POSTHOG_HOST',
  'POSTHOG_API_KEY', 
  'NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY',
  'EDGE_CONFIG',
]

log('🔍 6FB AI Agent System - Environment Configuration Checker', 'bold')
log('='.repeat(60), 'bold')

const envFiles = ['.env.local', '.env.production', '.env']
let foundEnvFile = null

for (const file of envFiles) {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    foundEnvFile = file
    log(`✓ Found environment file: ${file}`, 'green')
    break
  }
}

if (!foundEnvFile) {
  log('❌ No environment file found!', 'red')
  log('📝 Create one by copying .env.local.example:', 'yellow')
  log('   cp .env.local.example .env.local\n', 'cyan')
  process.exit(1)
}

const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '..', foundEnvFile) })

let missingRequired = []
let missingOptional = []
let configured = []
let errors = []

log('\n📋 Checking Required Environment Variables:', 'bold')

for (const [category, vars] of Object.entries(requiredVars)) {
  log(`\n${category.toUpperCase()}:`, 'cyan')
  
  for (const varName of vars) {
    const value = process.env[varName]
    
    if (!value || value.includes('your_') || value.includes('_here')) {
      log(`  ✗ ${varName}: Missing or placeholder value`, 'red')
      missingRequired.push(varName)
    } else {
      log(`  ✓ ${varName}: Configured`, 'green')
      configured.push(varName)
    }
  }
}

log('\n📋 Checking Optional Environment Variables:', 'bold')
optionalVars.forEach(varName => {
  const value = process.env[varName]
  
  if (!value || value.includes('your_') || value.includes('_here')) {
    log(`  ⚠ ${varName}: Not configured (optional)`, 'yellow')
    missingOptional.push(varName)
  } else {
    log(`  ✓ ${varName}: Configured`, 'green')
    configured.push(varName)
  }
})

log('\n🔗 Validating URLs:', 'bold')
const urlVars = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SUPABASE_URL']

urlVars.forEach(varName => {
  const value = process.env[varName]
  if (value && !value.includes('your_')) {
    try {
      new URL(value)
      log(`  ✓ ${varName}: Valid URL`, 'green')
    } catch (error) {
      log(`  ✗ ${varName}: Invalid URL format`, 'red')
      errors.push(`${varName}: Invalid URL format`)
    }
  }
})

log('\n🔑 Validating API Key Formats:', 'bold')
const keyValidations = {
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': /^pk_(test|live)_/,
  'CLERK_SECRET_KEY': /^sk_(test|live)_/,
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': /^pk_(test|live)_/,
  'STRIPE_SECRET_KEY': /^sk_(test|live)_/,
  'STRIPE_WEBHOOK_SECRET': /^whsec_/,
  'OPENAI_API_KEY': /^sk-/,
  'ANTHROPIC_API_KEY': /^sk-ant-/,
}

for (const [varName, pattern] of Object.entries(keyValidations)) {
  const value = process.env[varName]
  if (value && !value.includes('your_')) {
    if (pattern.test(value)) {
      log(`  ✓ ${varName}: Valid format`, 'green')
    } else {
      log(`  ✗ ${varName}: Invalid format`, 'red')
      errors.push(`${varName}: Invalid key format`)
    }
  }
}

log('\n' + '='.repeat(60), 'bold')
log('🎯 ENVIRONMENT CONFIGURATION REPORT', 'bold')
log('='.repeat(60), 'bold')

log(`\n✅ Configured: ${configured.length} variables`, 'green')
log(`⚠️  Optional Missing: ${missingOptional.length} variables`, 'yellow')
log(`❌ Required Missing: ${missingRequired.length} variables`, 'red')
log(`🚨 Validation Errors: ${errors.length} issues`, 'red')

log('\n📊 Service Configuration Status:', 'bold')
const services = {
  'Database (Supabase)': requiredVars.database,
  'Authentication (Clerk)': requiredVars.authentication,
  'Payments (Stripe)': requiredVars.payments,
  'AI Services': requiredVars.ai,
  'Monitoring (Sentry)': requiredVars.monitoring,
  'Notifications (Novu)': requiredVars.notifications,
  'Real-time (Pusher)': requiredVars.realtime,
  'Analytics (PostHog)': requiredVars.analytics,
}

Object.entries(services).forEach(([service, vars]) => {
  const allConfigured = vars.every(v => 
    process.env[v] && !process.env[v].includes('your_') && !process.env[v].includes('_here')
  )
  log(`  ${allConfigured ? '✅' : '❌'} ${service}`, allConfigured ? 'green' : 'red')
})

if (missingRequired.length > 0) {
  log('\n❌ MISSING REQUIRED VARIABLES:', 'red')
  missingRequired.forEach(v => log(`  • ${v}`, 'red'))
}

if (errors.length > 0) {
  log('\n🚨 VALIDATION ERRORS:', 'red')
  errors.forEach(error => log(`  • ${error}`, 'red'))
}

if (missingOptional.length > 0) {
  log('\n⚠️  MISSING OPTIONAL VARIABLES:', 'yellow')
  missingOptional.forEach(v => log(`  • ${v}`, 'yellow'))
}

const totalErrors = missingRequired.length + errors.length

if (totalErrors === 0) {
  log('\n🎉 Environment configuration is ready for production!', 'green')
  log('\nNext steps:', 'bold')
  log('  1. Run: npm run setup-db', 'cyan')
  log('  2. Run: npm run build', 'cyan')
  log('  3. Run: npm run health', 'cyan')
  log('  4. Deploy to Vercel/Railway', 'cyan')
} else {
  log('\n💡 Please fix the issues above before deployment.', 'yellow')
  log('\nHelpful commands:', 'bold')
  log('  • Copy template: cp .env.local.example .env.local', 'cyan')
  log('  • Edit config: nano .env.local', 'cyan')
  log('  • Check again: npm run check-env', 'cyan')
  log('  • Test connection: npm run check-env --test-connections', 'cyan')
}

process.exit(totalErrors === 0 ? 0 : 1)