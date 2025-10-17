#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Checks all required environment variables for the 6FB AI Agent System
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local file manually since we're not using dotenv
function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        // Only set if not already in process.env
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error(`Error loading .env.local: ${error.message}`)
  }
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

// Required environment variables categorized by importance
const requiredVars = {
  critical: [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Supabase project URL',
      example: 'https://xxxxx.supabase.co',
      where: 'Supabase Dashboard → Settings → API'
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous/public key',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      where: 'Supabase Dashboard → Settings → API'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key (bypasses RLS)',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      where: 'Supabase Dashboard → Settings → API',
      warning: '⚠️  Keep this secret! Never commit to git or expose to client'
    }
  ],
  optional: [
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key for AI features',
      where: 'OpenAI Dashboard → API Keys'
    },
    {
      name: 'ANTHROPIC_API_KEY',
      description: 'Anthropic API key for Claude AI',
      where: 'Anthropic Console → API Keys'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe secret key for payments',
      where: 'Stripe Dashboard → Developers → API Keys'
    },
    {
      name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      description: 'Stripe publishable key',
      where: 'Stripe Dashboard → Developers → API Keys'
    }
  ]
}

function checkEnvFile() {
  const envPath = join(__dirname, '.env.local')
  const exists = existsSync(envPath)

  console.log(`\n${colors.bright}${colors.blue}🔍 Checking Environment Setup${colors.reset}\n`)
  console.log(`${colors.cyan}📁 .env.local file:${colors.reset}`, exists ? `${colors.green}✓ Found${colors.reset}` : `${colors.red}✗ Missing${colors.reset}`)

  if (!exists) {
    console.log(`\n${colors.yellow}⚠️  .env.local file not found!${colors.reset}`)
    console.log(`\nCreate it by running:`)
    console.log(`  ${colors.cyan}cp .env.example .env.local${colors.reset}`)
    console.log(`\nThen add your environment variables to .env.local\n`)
    return false
  }

  // Load the environment variables from .env.local
  console.log(`${colors.cyan}📥 Loading environment variables...${colors.reset}`)
  loadEnvFile(envPath)

  return true
}

function checkVariable(varConfig) {
  const value = process.env[varConfig.name]
  const isSet = value && value.trim() !== ''

  const status = isSet
    ? `${colors.green}✓ Set${colors.reset}`
    : `${colors.red}✗ Missing${colors.reset}`

  console.log(`\n${colors.bright}${varConfig.name}${colors.reset}`)
  console.log(`  Status: ${status}`)
  console.log(`  Description: ${varConfig.description}`)

  if (!isSet) {
    console.log(`  ${colors.yellow}Where to get:${colors.reset} ${varConfig.where}`)
    if (varConfig.example) {
      console.log(`  ${colors.yellow}Format:${colors.reset} ${varConfig.example}`)
    }
    if (varConfig.warning) {
      console.log(`  ${varConfig.warning}`)
    }
  } else if (varConfig.warning && value.length < 100) {
    console.log(`  ${colors.yellow}⚠️  Value seems too short - verify this is correct${colors.reset}`)
  }

  return isSet
}

function printSummary(criticalMissing, optionalMissing) {
  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.bright}Summary${colors.reset}\n`)

  if (criticalMissing.length === 0) {
    console.log(`${colors.green}✓ All critical environment variables are set!${colors.reset}`)
  } else {
    console.log(`${colors.red}✗ Missing ${criticalMissing.length} critical variable(s):${colors.reset}`)
    criticalMissing.forEach(name => console.log(`  - ${name}`))
    console.log(`\n${colors.yellow}⚠️  The application will not work properly without these!${colors.reset}`)
  }

  if (optionalMissing.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Missing ${optionalMissing.length} optional variable(s):${colors.reset}`)
    optionalMissing.forEach(name => console.log(`  - ${name}`))
    console.log(`\nThese are optional but enable additional features.`)
  }

  if (criticalMissing.length === 0 && optionalMissing.length === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 All environment variables are configured!${colors.reset}`)
  }

  console.log(`\n${colors.cyan}Next steps:${colors.reset}`)
  if (criticalMissing.length > 0) {
    console.log(`  1. Add missing variables to .env.local`)
    console.log(`  2. Restart the development server`)
    console.log(`  3. Run this script again to verify`)
  } else {
    console.log(`  1. Restart the development server: ${colors.cyan}./dev-start.sh${colors.reset}`)
    console.log(`  2. Test the application: ${colors.cyan}curl http://localhost:9999/api/health${colors.reset}`)
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
}

async function main() {
  // Check if .env.local exists
  const envFileExists = checkEnvFile()

  if (!envFileExists) {
    process.exit(1)
  }

  // Check critical variables
  console.log(`\n${colors.bright}${colors.red}Critical Variables (Required)${colors.reset}`)
  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)

  const criticalMissing = []
  for (const varConfig of requiredVars.critical) {
    const isSet = checkVariable(varConfig)
    if (!isSet) {
      criticalMissing.push(varConfig.name)
    }
  }

  // Check optional variables
  console.log(`\n\n${colors.bright}${colors.yellow}Optional Variables (Enhances Features)${colors.reset}`)
  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)

  const optionalMissing = []
  for (const varConfig of requiredVars.optional) {
    const isSet = checkVariable(varConfig)
    if (!isSet) {
      optionalMissing.push(varConfig.name)
    }
  }

  // Print summary
  printSummary(criticalMissing, optionalMissing)

  // Exit with error code if critical vars are missing
  process.exit(criticalMissing.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error(`\n${colors.red}Error running verification:${colors.reset}`, error)
  process.exit(1)
})
