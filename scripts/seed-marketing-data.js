#!/usr/bin/env node

/**
 * Seed Marketing Test Data in Supabase
 * Creates realistic test data for the marketing campaign system
 */

const { createClient } = require('@supabase/supabase-js')

// Database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

console.log('🌱 Seeding Marketing Test Data...')

// Test data for realistic campaigns
const testData = {
  // Test barbershops
  barbershops: [
    {
      id: 'test-shop-001',
      name: "Tony's Classic Cuts", 
      email: 'tony@classiccuts.com',
      phone: '+15551234567',
      address: '123 Main St, New York, NY 10001'
    },
    {
      id: 'test-shop-002',
      name: 'Elite Styles Barbershop',
      email: 'info@elitestyles.com', 
      phone: '+15551234568',
      address: '456 Oak Ave, Los Angeles, CA 90210'
    },
    {
      id: 'test-shop-003',
      name: 'Modern Man Grooming',
      email: 'contact@modernman.com',
      phone: '+15551234569', 
      address: '789 Pine St, Chicago, IL 60601'
    }
  ],

  // Test customers (use your real email/phone for testing)
  customers: [
    {
      name: 'John Smith',
      email: 'your-email@gmail.com', // Replace with your email
      phone: '+1YOUR_PHONE_NUMBER',  // Replace with your phone
      first_name: 'John',
      last_name: 'Smith',
      vip_status: true,
      total_visits: 15,
      total_spent: 450.00,
      is_active: true
    },
    {
      name: 'Jane Doe',
      email: 'jane.doe.test@example.com',
      phone: '+15551111111',
      first_name: 'Jane', 
      last_name: 'Doe',
      vip_status: false,
      total_visits: 3,
      total_spent: 90.00,
      is_active: true
    },
    {
      name: 'Mike Johnson', 
      email: 'mike.j.test@example.com',
      phone: '+15552222222',
      first_name: 'Mike',
      last_name: 'Johnson',
      vip_status: false,
      total_visits: 1,
      total_spent: 30.00,
      is_active: true
    }
  ],

  // Test marketing accounts
  marketingAccounts: [
    {
      owner_id: 'test-shop-owner-1',
      owner_type: 'shop',
      account_name: 'Main Marketing Account',
      stripe_customer_id: 'cus_test_12345',
      payment_method_id: 'pm_test_12345',
      is_active: true
    },
    {
      owner_id: 'test-barber-1', 
      owner_type: 'barber',
      account_name: 'Personal Marketing',
      stripe_customer_id: 'cus_test_67890',
      payment_method_id: 'pm_test_67890',
      is_active: true
    }
  ],

  // Test segments
  customerSegments: [
    {
      created_by: 'test-shop-owner-1',
      name: 'All Customers',
      description: 'All active customers',
      criteria: { active: true },
      customer_count: 3
    },
    {
      created_by: 'test-shop-owner-1', 
      name: 'VIP Customers',
      description: 'High-value customers',
      criteria: { vip_status: true },
      customer_count: 1
    },
    {
      created_by: 'test-shop-owner-1',
      name: 'New Customers', 
      description: 'Customers with 1 visit or less',
      criteria: { total_visits: { lte: 1 } },
      customer_count: 1
    }
  ],

  // Test campaigns
  campaigns: [
    {
      created_by: 'test-shop-owner-1',
      name: 'Welcome New Customers',
      type: 'email',
      status: 'draft',
      subject: 'Welcome to Tony\'s Classic Cuts!',
      message: 'Thank you for choosing us for your grooming needs. Book your next appointment and get 10% off!',
      audience_type: 'segment',
      audience_filters: { segment: 'new' },
      estimated_cost: 0.05
    },
    {
      created_by: 'test-shop-owner-1',
      name: 'VIP Special Offer',
      type: 'sms', 
      status: 'draft',
      message: 'Exclusive VIP offer: Premium haircut + beard trim for $45 (reg $60). Book this week!',
      audience_type: 'segment',
      audience_filters: { segment: 'vip' },
      estimated_cost: 0.15
    }
  ]
}

async function seedMarketingData() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('📊 Connecting to Supabase...')
    
    // Test connection
    const { data: test } = await supabase.from('profiles').select('id').limit(1)
    console.log('✅ Connected to Supabase successfully')
    
    // Seed customers (most important for testing)
    console.log('\n👥 Seeding test customers...')
    for (const customer of testData.customers) {
      try {
        const { error } = await supabase
          .from('customers')
          .upsert(customer, { onConflict: 'email' })
        
        if (error) {
          console.log(`   ⚠️  Customer ${customer.name}: ${error.message}`)
        } else {
          console.log(`   ✅ ${customer.name}`)
        }
      } catch (err) {
        console.log(`   ❌ ${customer.name}: ${err.message}`)
      }
    }
    
    // Seed marketing accounts
    console.log('\n💳 Seeding marketing accounts...')
    for (const account of testData.marketingAccounts) {
      try {
        const { error } = await supabase
          .from('marketing_accounts')
          .upsert(account, { onConflict: 'owner_id' })
        
        if (error) {
          console.log(`   ⚠️  Account ${account.account_name}: ${error.message}`)
        } else {
          console.log(`   ✅ ${account.account_name}`)
        }
      } catch (err) {
        console.log(`   ❌ ${account.account_name}: ${err.message}`)
      }
    }
    
    // Seed customer segments  
    console.log('\n🎯 Seeding customer segments...')
    for (const segment of testData.customerSegments) {
      try {
        const { error } = await supabase
          .from('customer_segments')
          .upsert(segment, { onConflict: 'name,created_by' })
        
        if (error) {
          console.log(`   ⚠️  Segment ${segment.name}: ${error.message}`)
        } else {
          console.log(`   ✅ ${segment.name}`)
        }
      } catch (err) {
        console.log(`   ❌ ${segment.name}: ${err.message}`)
      }
    }
    
    // Seed test campaigns
    console.log('\n📧 Seeding test campaigns...')
    for (const campaign of testData.campaigns) {
      try {
        const { error } = await supabase
          .from('marketing_campaigns')
          .upsert(campaign, { onConflict: 'name,created_by' })
        
        if (error) {
          console.log(`   ⚠️  Campaign ${campaign.name}: ${error.message}`)
        } else {
          console.log(`   ✅ ${campaign.name}`)
        }
      } catch (err) {
        console.log(`   ❌ ${campaign.name}: ${err.message}`)
      }
    }
    
    console.log('\n🎉 Marketing test data seeded successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Visit http://localhost:9999/dashboard/campaigns')
    console.log('   2. Test campaign creation and sending')
    console.log('   3. Use your real email/phone for test sends')
    console.log('   4. Check white-label branding in received messages')
    
    return true
    
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error)
    return false
  }
}

// Run the seeding
if (require.main === module) {
  seedMarketingData()
    .then(success => {
      if (success) {
        console.log('\n✨ Marketing system ready for testing!')
      } else {
        console.log('\n❌ Seeding failed - check errors above')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error)
      process.exit(1)
    })
}

module.exports = { seedMarketingData }