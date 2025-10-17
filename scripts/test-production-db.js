/**
 * Production Database Connection Test Script
 *
 * This script tests the complete data loading chain to identify
 * where the production failure is occurring.
 *
 * Usage:
 *   node scripts/test-production-db.js [user-email]
 *
 * Example:
 *   node scripts/test-production-db.js user@bookbarber.com
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${COLORS.reset}`)
}

function success(message) {
  log(COLORS.green, '✓', message)
}

function error(message) {
  log(COLORS.red, '✗', message)
}

function info(message) {
  log(COLORS.blue, 'ℹ', message)
}

function warning(message) {
  log(COLORS.yellow, '⚠', message)
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Production Database Connection Test')
  console.log('='.repeat(60) + '\n')

  const userEmail = process.argv[2]

  // Step 1: Check Environment Variables
  console.log('📋 Step 1: Environment Variables')
  console.log('─'.repeat(60))

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  let envVarsValid = true
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      success(`${envVar}: Set`)
      // Show first 20 chars for debugging
      const preview = process.env[envVar].substring(0, 20) + '...'
      info(`  Preview: ${preview}`)
    } else {
      error(`${envVar}: Missing!`)
      envVarsValid = false
    }
  }

  if (!envVarsValid) {
    error('\n❌ Environment variables are missing. Check .env.local file.')
    process.exit(1)
  }

  console.log('')

  // Step 2: Test Supabase Connection
  console.log('🔌 Step 2: Supabase Connection')
  console.log('─'.repeat(60))

  let supabase
  try {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    success('Supabase client created successfully')
    info(`  URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  } catch (err) {
    error(`Failed to create Supabase client: ${err.message}`)
    process.exit(1)
  }

  console.log('')

  // Step 3: Test Basic Query (profiles table)
  console.log('💾 Step 3: Database Query Test')
  console.log('─'.repeat(60))

  try {
    const { data, error: queryError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (queryError) {
      error(`Query failed: ${queryError.message}`)
      info(`  Code: ${queryError.code}`)
      info(`  Details: ${queryError.details}`)
    } else {
      success(`Database query successful`)
      info(`  Total profiles: ${count || 0}`)
    }
  } catch (err) {
    error(`Database query exception: ${err.message}`)
  }

  console.log('')

  // Step 4: Find User Profile (if email provided)
  if (userEmail) {
    console.log('👤 Step 4: User Profile Lookup')
    console.log('─'.repeat(60))

    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)

      if (profileError) {
        error(`Profile query failed: ${profileError.message}`)
      } else if (!profiles || profiles.length === 0) {
        warning(`No profile found for email: ${userEmail}`)
        info('  User may not exist in database')
      } else {
        const profile = profiles[0]
        success(`Profile found for: ${userEmail}`)
        info(`  User ID: ${profile.id}`)
        info(`  Role: ${profile.role || 'Not set'}`)
        info(`  Barbershop ID: ${profile.barbershop_id || 'Not set'}`)
        info(`  Organization ID: ${profile.organization_id || 'Not set'}`)

        // Step 5: Test Location Access
        console.log('')
        console.log('📍 Step 5: Location Access Test')
        console.log('─'.repeat(60))

        if (profile.barbershop_id) {
          const { data: barbershop, error: shopError } = await supabase
            .from('barbershops')
            .select('*')
            .eq('id', profile.barbershop_id)
            .single()

          if (shopError) {
            error(`Barbershop query failed: ${shopError.message}`)
            info(`  User has barbershop_id but shop doesn't exist`)
          } else {
            success(`Barbershop found: ${barbershop.name}`)
            info(`  Address: ${barbershop.address}, ${barbershop.city}, ${barbershop.state}`)
            info(`  Status: ${barbershop.is_active ? 'Active' : 'Inactive'}`)
          }
        } else {
          warning('Profile has no barbershop_id set')
          info('  This is why no locations are loading!')

          // Check if user owns any barbershops
          const { data: ownedShops, error: ownerError } = await supabase
            .from('barbershops')
            .select('id, name')
            .eq('owner_id', profile.id)

          if (!ownerError && ownedShops && ownedShops.length > 0) {
            warning(`  User owns ${ownedShops.length} barbershop(s) but barbershop_id not set in profile!`)
            info('  Fix: Update profile.barbershop_id to one of:')
            ownedShops.forEach(shop => {
              info(`    - ${shop.id} (${shop.name})`)
            })
          }
        }

        // Step 6: Test Appointments
        console.log('')
        console.log('📅 Step 6: Appointments Data Test')
        console.log('─'.repeat(60))

        if (profile.barbershop_id) {
          const { data: appointments, error: appError, count: appCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .eq('barbershop_id', profile.barbershop_id)
            .limit(5)

          if (appError) {
            error(`Appointments query failed: ${appError.message}`)
          } else {
            success(`Appointments query successful`)
            info(`  Total appointments: ${appCount || 0}`)
            if (appointments && appointments.length > 0) {
              info(`  Sample appointment: ${appointments[0].client_name || 'No name'} - ${appointments[0].scheduled_at}`)
            }
          }
        } else {
          warning('Skipping appointments test (no barbershop_id)')
        }

        // Step 7: Test Customers
        console.log('')
        console.log('👥 Step 7: Customers Data Test')
        console.log('─'.repeat(60))

        if (profile.barbershop_id) {
          const { data: customers, error: custError, count: custCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('barbershop_id', profile.barbershop_id)
            .limit(5)

          if (custError) {
            error(`Customers query failed: ${custError.message}`)
          } else {
            success(`Customers query successful`)
            info(`  Total customers: ${custCount || 0}`)
          }
        } else {
          warning('Skipping customers test (no barbershop_id)')
        }
      }
    } catch (err) {
      error(`Profile lookup exception: ${err.message}`)
    }
  } else {
    info('💡 Tip: Provide user email as argument to test specific user data')
    info('   Usage: node scripts/test-production-db.js user@email.com')
  }

  // Final Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))

  if (!envVarsValid) {
    error('❌ FAILED: Environment variables missing')
    console.log('')
    console.log('🔧 Fix: Set these variables in .env.local:')
    requiredEnvVars.forEach(v => console.log(`   ${v}=your_value_here`))
  } else if (userEmail && !userEmail.includes('@')) {
    warning('⚠️  INCOMPLETE: Invalid email provided')
  } else if (!userEmail) {
    success('✅ Basic connection tests passed')
    console.log('')
    info('💡 Next step: Run with user email to test full data chain')
    info('   node scripts/test-production-db.js user@bookbarber.com')
  } else {
    success('✅ All tests completed - check results above')
  }

  console.log('')
}

// Run the test
main().catch(err => {
  error(`Fatal error: ${err.message}`)
  console.error(err)
  process.exit(1)
})
