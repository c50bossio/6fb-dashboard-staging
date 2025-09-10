#!/usr/bin/env node

/**
 * Setup Production Billing Database Schema
 * This script creates all the necessary tables for real billing functionality
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupBillingDatabase() {

  try {
    // Read the SQL schema file
    const schemaPath = join(__dirname, '..', 'database', 'billing-schema.sql')
    const schema = readFileSync(schemaPath, 'utf8')

    // Execute the schema - split by major sections for better error handling
    const sections = schema.split('-- =============================================================================')
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim()
      if (!section || section.startsWith('6FB AI Agent System')) continue

      // Execute each SQL section
      const { error } = await supabase.rpc('exec_sql', { sql: section })
      
      if (error) {
        console.warn(`   ⚠️  Warning in section ${i}:`, error.message)
        // Continue with other sections - some errors might be expected (like table already exists)
      } else {
        
      }
    }

    // Verify tables were created
    const tables = [
      'usage_events',
      'billing_cycles', 
      'invoices',
      'payment_methods',
      'usage_limits',
      'billing_config'
    ]

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.error(`   ❌ Table ${table}: ${error.message}`)
      } else {
        
      }
    }

    // Verify functions exist

    const functions = [
      'get_current_billing_period()',
      'generate_invoice_number(auth.uid())',
    ]

    for (const func of functions) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `SELECT ${func};`
        })
        
        if (error) {
          console.error(`   ❌ Function ${func}: ${error.message}`)
        } else {
          
        }
      } catch (err) {
        console.warn(`   ⚠️  Function ${func}: Could not test`)
      }
    }

    // Initialize usage limits for existing users

    const { data: users } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
    
    if (users && users.length > 0) {
      for (const user of users) {
        const currentPeriod = new Date()
        currentPeriod.setDate(1) // First day of current month
        const periodStart = currentPeriod.toISOString().split('T')[0]
        
        // Get tier limits
        const limits = getTierLimits(user.subscription_tier)
        
        const { error } = await supabase
          .from('usage_limits')
          .upsert({
            user_id: user.id,
            period_start: periodStart,
            subscription_tier: user.subscription_tier,
            ai_tokens_limit: limits.aiTokens,
            sms_limit: limits.smsCredits,
            email_limit: limits.emailCredits
          })
        
        if (error) {
          console.warn(`   ⚠️  Could not set limits for user ${user.id}:`, error.message)
        }
      }

    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

// Helper function to get tier limits (matches subscription-tiers.js)
function getTierLimits(tierName) {
  const normalizedTier = (tierName || 'FREE').toString().toUpperCase()
  
  const limits = {
    'FREE': {
      aiTokens: 5000,
      smsCredits: 500,
      emailCredits: 1000
    },
    'INDIVIDUAL': {
      aiTokens: 5000,
      smsCredits: 500,
      emailCredits: 1000
    },
    'PROFESSIONAL': {
      aiTokens: 20000,
      smsCredits: 2000,
      emailCredits: 5000
    },
    'ENTERPRISE': {
      aiTokens: 100000,
      smsCredits: 10000,
      emailCredits: 25000
    }
  }
  
  return limits[normalizedTier] || limits.FREE
}

// Run the setup
setupBillingDatabase().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})