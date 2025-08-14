#!/usr/bin/env node

/**
 * Quick test of billing setup
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase
const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function testBillingSetup() {
  console.log('🧪 Testing billing setup...')

  try {
    // Test 1: Check if marketing_accounts table exists
    console.log('\n1. Testing marketing_accounts table...')
    const { data: accounts, error: accountsError } = await supabase
      .from('marketing_accounts')
      .select('*')
      .limit(5)

    if (accountsError) {
      console.log('❌ Accounts error:', accountsError.message)
    } else {
      console.log(`✅ Found ${accounts.length} accounts`)
      if (accounts.length > 0) {
        console.log('   First account:', accounts[0].account_name)
      }
    }

    // Test 2: Check campaigns table
    console.log('\n2. Testing marketing_campaigns table...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .limit(5)

    if (campaignsError) {
      console.log('❌ Campaigns error:', campaignsError.message)
    } else {
      console.log(`✅ Found ${campaigns.length} campaigns`)
    }

    // Test 3: Check billing records
    console.log('\n3. Testing marketing_billing_records table...')
    const { data: records, error: recordsError } = await supabase
      .from('marketing_billing_records')
      .select('*')
      .limit(5)

    if (recordsError) {
      console.log('❌ Records error:', recordsError.message)
    } else {
      console.log(`✅ Found ${records.length} billing records`)
    }

    // Test 4: Try creating a simple test account
    console.log('\n4. Creating test account...')
    const { data: newAccount, error: createError } = await supabase
      .from('marketing_accounts')
      .insert({
        owner_id: 'test-user-001',
        owner_type: 'shop',
        account_name: 'Test Account Quick',
        description: 'Quick test account',
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.log('❌ Create error:', createError.message)
    } else {
      console.log('✅ Created test account:', newAccount.id)
    }

    console.log('\n🎯 Billing setup test completed!')

  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testBillingSetup().catch(console.error)