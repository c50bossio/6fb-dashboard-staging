#!/usr/bin/env node

/**
 * Test Data Setup Script for Payment Flow Testing
 * 
 * This script creates test user accounts and cleans up old test data
 * to ensure consistent manual testing of the payment flow.
 * 
 * Usage:
 *   node scripts/create-test-accounts.js
 *   node scripts/create-test-accounts.js --cleanup-only
 *   node scripts/create-test-accounts.js --count=5
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_ACCOUNT_CONFIGS = [
  {
    role: 'barber',
    name: 'Individual Barber Test',
    email: 'test-barber-{timestamp}@bookedbarber.test',
    password: 'TestPassword123!',
    subscription_tier: null,
    shop_name: 'Test Barber Studio'
  },
  {
    role: 'shop_owner',
    name: 'Shop Owner Test',
    email: 'test-shopowner-{timestamp}@bookedbarber.test',
    password: 'TestPassword123!',
    subscription_tier: null,
    shop_name: 'Test Barbershop'
  },
  {
    role: 'enterprise_owner',
    name: 'Enterprise Owner Test',
    email: 'test-enterprise-{timestamp}@bookedbarber.test',
    password: 'TestPassword123!',
    subscription_tier: null,
    shop_name: 'Test Enterprise Chain'
  },
  {
    role: 'barber',
    name: 'Active Barber Test',
    email: 'test-active-barber-{timestamp}@bookedbarber.test',
    password: 'TestPassword123!',
    subscription_tier: 'barber',
    subscription_status: 'active',
    shop_name: 'Active Test Studio'
  },
  {
    role: 'shop_owner',
    name: 'Active Shop Owner Test',
    email: 'test-active-shop-{timestamp}@bookedbarber.test',
    password: 'TestPassword123!',
    subscription_tier: 'shop',
    subscription_status: 'active',
    shop_name: 'Active Test Shop'
  }
]

const args = process.argv.slice(2)
const options = {
  cleanupOnly: args.includes('--cleanup-only'),
  count: parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1]) || TEST_ACCOUNT_CONFIGS.length
}

/**
 * Generate a unique timestamp for test account emails
 */
function generateTimestamp() {
  return Date.now().toString()
}

/**
 * Generate a unique test email
 */
function generateTestEmail(template, timestamp) {
  return template.replace('{timestamp}', timestamp)
}

/**
 * Clean up old test accounts
 */
async function cleanupOldTestAccounts() {
  console.log('🧹 Cleaning up old test accounts...')
  
  try {
    const { data: testUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', '%@bookedbarber.test')
    
    if (fetchError) {
      throw fetchError
    }

    if (testUsers.length === 0) {
      console.log('   No test accounts found to clean up')
      return
    }

    console.log(`   Found ${testUsers.length} test accounts to remove`)
    
    const batchSize = 10
    for (let i = 0; i < testUsers.length; i += batchSize) {
      const batch = testUsers.slice(i, i + batchSize)
      const userIds = batch.map(user => user.id)
      
      console.log(`   Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testUsers.length/batchSize)}`)
      
      for (const user of batch) {
        try {
          const { error } = await supabase.auth.admin.deleteUser(user.id)
          if (error && !error.message.includes('User not found')) {
            console.warn(`     Warning: Could not delete auth user ${user.email}:`, error.message)
          }
        } catch (authError) {
          console.warn(`     Warning: Auth deletion error for ${user.email}:`, authError.message)
        }
      }
      
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', userIds)
      
      if (deleteError) {
        console.warn(`     Warning: Database deletion error:`, deleteError.message)
      } else {
        console.log(`     Successfully deleted ${batch.length} accounts`)
      }
    }
    
    await cleanupTestData()
    
    console.log('✅ Cleanup completed successfully')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    throw error
  }
}

/**
 * Clean up related test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up related test data...')
  
  const tables = [
    'subscription_history',
    'barbershops',
    'appointments',
    'services'
  ]
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .limit(1)
      
      if (!error) {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .ilike('name', 'Test %')
          .neq('id', '00000000-0000-0000-0000-000000000000') // Safety check
        
        if (deleteError && !deleteError.message.includes('no rows')) {
          console.warn(`     Warning: Could not clean ${table}:`, deleteError.message)
        }
      }
    } catch (error) {
      console.warn(`     Warning: Table ${table} cleanup error:`, error.message)
    }
  }
}

/**
 * Create a test user account
 */
async function createTestAccount(config, timestamp) {
  const email = generateTestEmail(config.email, timestamp)
  
  console.log(`   Creating: ${config.name} (${email})`)
  
  try {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: config.password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        name: config.name,
        role: config.role
      }
    })
    
    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`)
    }
    
    if (!authUser.user) {
      throw new Error('No user returned from auth creation')
    }
    
    const userProfile = {
      id: authUser.user.id,
      email: email,
      name: config.name,
      role: config.role,
      subscription_tier: config.subscription_tier,
      subscription_status: config.subscription_status || 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    if (config.subscription_tier && config.subscription_status === 'active') {
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      
      userProfile.stripe_customer_id = `cus_test_${timestamp}_${config.role}`
      userProfile.stripe_subscription_id = `sub_test_${timestamp}_${config.role}`
      userProfile.subscription_current_period_start = now.toISOString()
      userProfile.subscription_current_period_end = nextMonth.toISOString()
      userProfile.sms_credits_used = 0
      userProfile.email_credits_used = 0
      userProfile.ai_tokens_used = 0
    }
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(userProfile)
    
    if (profileError) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }
    
    if (config.shop_name && (config.role === 'shop_owner' || config.role === 'enterprise_owner' || config.role === 'barber')) {
      await createTestBarbershop(authUser.user.id, config.shop_name, timestamp)
    }
    
    console.log(`     ✅ Created successfully (ID: ${authUser.user.id})`)
    
    return {
      id: authUser.user.id,
      email: email,
      name: config.name,
      role: config.role,
      subscription_tier: config.subscription_tier,
      password: config.password // For testing purposes
    }
    
  } catch (error) {
    console.error(`     ❌ Failed to create ${email}:`, error.message)
    throw error
  }
}

/**
 * Create a test barbershop
 */
async function createTestBarbershop(userId, shopName, timestamp) {
  try {
    const barbershop = {
      id: `shop_test_${timestamp}_${userId.slice(0, 8)}`,
      name: shopName,
      owner_id: userId,
      slug: `test-shop-${timestamp}`,
      email: `shop-${timestamp}@bookedbarber.test`,
      phone: '+1234567890',
      address: '123 Test Street, Test City, TC 12345',
      description: 'Test barbershop for payment flow testing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('barbershops')
      .insert(barbershop)
    
    if (error) {
      console.warn(`     Warning: Could not create barbershop ${shopName}:`, error.message)
    } else {
      console.log(`     📍 Created barbershop: ${shopName}`)
    }
  } catch (error) {
    console.warn(`     Warning: Barbershop creation error:`, error.message)
  }
}

/**
 * Create test accounts
 */
async function createTestAccounts() {
  console.log('👥 Creating test accounts...')
  
  const timestamp = generateTimestamp()
  const accountsToCreate = TEST_ACCOUNT_CONFIGS.slice(0, options.count)
  const createdAccounts = []
  
  for (const config of accountsToCreate) {
    try {
      const account = await createTestAccount(config, timestamp)
      createdAccounts.push(account)
    } catch (error) {
      console.error(`Failed to create account for ${config.name}:`, error.message)
    }
  }
  
  console.log(`✅ Created ${createdAccounts.length}/${accountsToCreate.length} test accounts`)
  
  return createdAccounts
}

/**
 * Generate test credentials file
 */
async function generateTestCredentials(accounts) {
  const credentials = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    accounts: accounts,
    testing_notes: {
      stripe_test_mode: 'Ensure Stripe is in TEST mode',
      test_cards: {
        success: '4242424242424242',
        declined: '4000000000000002',
        insufficient_funds: '4000000000009995',
        expired: '4000000000000069'
      },
      manual_testing_guide: 'See tests/MANUAL_PAYMENT_TEST_GUIDE.md'
    }
  }
  
  const fs = require('fs')
  const path = require('path')
  
  const credentialsPath = path.join(__dirname, '..', 'test-credentials.json')
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2))
  
  console.log(`📄 Test credentials saved to: ${credentialsPath}`)
  console.log('\n📋 Test Account Summary:')
  console.log('================================')
  
  accounts.forEach(account => {
    console.log(`${account.name}:`)
    console.log(`  Email: ${account.email}`)
    console.log(`  Password: ${account.password}`)
    console.log(`  Role: ${account.role}`)
    console.log(`  Subscription: ${account.subscription_tier || 'None'}`)
    console.log('')
  })
  
  return credentialsPath
}

/**
 * Verify database connection
 */
async function verifyConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (error) {
      throw error
    }
    
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('   Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
    return false
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Payment Flow Test Data Setup')
  console.log('================================')
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  
  console.log('🔌 Verifying database connection...')
  const connected = await verifyConnection()
  if (!connected) {
    process.exit(1)
  }
  console.log('✅ Database connection verified')
  
  try {
    await cleanupOldTestAccounts()
    
    if (!options.cleanupOnly) {
      const accounts = await createTestAccounts()
      await generateTestCredentials(accounts)
      
      console.log('\n🎉 Setup completed successfully!')
      console.log('\nNext steps:')
      console.log('1. Review the test credentials file')
      console.log('2. Ensure Stripe is in TEST mode')
      console.log('3. Follow the manual testing guide in tests/MANUAL_PAYMENT_TEST_GUIDE.md')
      console.log('4. Use the test accounts to verify payment flows')
    } else {
      console.log('\n🎉 Cleanup completed successfully!')
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  cleanupOldTestAccounts,
  createTestAccounts,
  generateTestCredentials
}