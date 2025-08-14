import { createClient } from '@supabase/supabase-js'

// Supabase connection with provided credentials
const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCustomerOperations() {
  console.log('🧪 Testing Customer Data Operations for Marketing System\n')
  console.log('='.repeat(60))
  
  try {
    // Test 1: Create a proper test customer with required fields
    console.log('\n📝 1. TESTING CUSTOMER INSERT WITH REQUIRED FIELDS')
    console.log('-'.repeat(40))
    
    const testCustomer = {
      shop_id: 'demo-shop-001', // Required field based on error message
      barbershop_id: 'demo-shop-001', // Use same as existing records
      name: 'Marketing Test Customer',
      email: `test-marketing-${Date.now()}@example.com`,
      phone: '+1-555-123-4567',
      is_vip: false,
      is_test: true, // Mark as test to easily identify
      is_active: true,
      total_visits: 0,
      total_spent: 0,
      vip_status: false,
      preferences: {
        hair_type: 'straight',
        preferred_services: ['haircut', 'beard_trim']
      },
      notification_preferences: {
        sms: true,
        email: true,
        reminders: true,
        confirmations: true,
        marketing: true // Important for marketing campaigns
      },
      notes: 'Test customer for marketing campaign validation'
    }
    
    console.log('🔍 Attempting to insert:', JSON.stringify(testCustomer, null, 2))
    
    const { data: insertResult, error: insertError } = await supabase
      .from('customers')
      .insert(testCustomer)
      .select()
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message)
      console.log('💡 Error details:', insertError)
    } else {
      console.log('✅ Successfully inserted test customer!')
      console.log('📋 Inserted record:', JSON.stringify(insertResult[0], null, 2))
      
      const customerId = insertResult[0].id
      
      // Test 2: Update customer for marketing segmentation
      console.log('\n📊 2. TESTING CUSTOMER UPDATE FOR MARKETING SEGMENTATION')
      console.log('-'.repeat(40))
      
      const marketingUpdate = {
        preferences: {
          ...testCustomer.preferences,
          marketing_segments: ['high_value', 'regular_customer'],
          preferred_communication: 'email',
          interests: ['premium_services', 'seasonal_promotions']
        },
        total_visits: 5,
        total_spent: 250.00,
        last_visit_at: new Date().toISOString()
      }
      
      const { data: updateResult, error: updateError } = await supabase
        .from('customers')
        .update(marketingUpdate)
        .eq('id', customerId)
        .select()
      
      if (updateError) {
        console.log('❌ Update failed:', updateError.message)
      } else {
        console.log('✅ Successfully updated customer for marketing!')
        console.log('📋 Updated record:', JSON.stringify(updateResult[0], null, 2))
      }
      
      // Test 3: Query customers for marketing segmentation
      console.log('\n🎯 3. TESTING MARKETING SEGMENTATION QUERIES')
      console.log('-'.repeat(40))
      
      // High-value customers (spent > $200)
      const { data: highValueCustomers, error: hvError } = await supabase
        .from('customers')
        .select('id, name, email, total_spent, total_visits')
        .gt('total_spent', 200)
        .eq('is_active', true)
      
      if (!hvError) {
        console.log(`✅ High-value customers (>$200): ${highValueCustomers.length}`)
        highValueCustomers.forEach(customer => {
          console.log(`  - ${customer.name}: $${customer.total_spent} (${customer.total_visits} visits)`)
        })
      }
      
      // VIP customers
      const { data: vipCustomers, error: vipError } = await supabase
        .from('customers')
        .select('id, name, email, total_spent, total_visits')
        .eq('vip_status', true)
      
      if (!vipError) {
        console.log(`✅ VIP customers: ${vipCustomers.length}`)
      }
      
      // Customers who allow marketing
      const { data: marketingOptInCustomers, error: marketingError } = await supabase
        .from('customers')
        .select('id, name, email, notification_preferences')
        .eq('notification_preferences->marketing', true)
      
      if (!marketingError) {
        console.log(`✅ Marketing opt-in customers: ${marketingOptInCustomers?.length || 0}`)
      }
      
      // Recent customers (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: recentCustomers, error: recentError } = await supabase
        .from('customers')
        .select('id, name, email, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('is_active', true)
      
      if (!recentError) {
        console.log(`✅ Recent customers (last 30 days): ${recentCustomers.length}`)
      }
      
      // Test 4: Test marketing campaign data structure
      console.log('\n📧 4. TESTING MARKETING CAMPAIGN DATA STRUCTURE')
      console.log('-'.repeat(40))
      
      const campaignData = {
        name: 'Summer Promotion 2025',
        type: 'email',
        status: 'draft',
        target_criteria: {
          total_spent_min: 100,
          total_visits_min: 3,
          last_visit_within_days: 60,
          segments: ['high_value', 'regular_customer']
        },
        content: {
          subject: 'Special Summer Offer - 20% Off Premium Services',
          template: 'summer_promotion_2025',
          discount_code: 'SUMMER20',
          discount_percentage: 20,
          valid_until: '2025-09-30'
        },
        budget: 500.00,
        start_date: '2025-08-15T09:00:00Z',
        end_date: '2025-09-30T23:59:59Z'
      }
      
      console.log('📋 Sample campaign structure:', JSON.stringify(campaignData, null, 2))
      
      // Calculate target audience based on existing customers
      const targetQuery = supabase
        .from('customers')
        .select('id, name, email')
        .gte('total_spent', campaignData.target_criteria.total_spent_min)
        .gte('total_visits', campaignData.target_criteria.total_visits_min)
        .eq('is_active', true)
      
      const { data: targetAudience, error: targetError } = await targetQuery
      
      if (!targetError) {
        console.log(`✅ Calculated target audience: ${targetAudience.length} customers`)
        console.log('📊 Target customer examples:')
        targetAudience.slice(0, 3).forEach(customer => {
          console.log(`  - ${customer.name} (${customer.email})`)
        })
      }
      
      // Test 5: Clean up test data
      console.log('\n🧹 5. CLEANING UP TEST DATA')
      console.log('-'.repeat(40))
      
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
      
      if (deleteError) {
        console.log('❌ Failed to delete test record:', deleteError.message)
      } else {
        console.log('✅ Successfully cleaned up test customer record')
      }
    }
    
    // Test 6: Analyze customer data for marketing insights
    console.log('\n📈 6. CUSTOMER DATA ANALYSIS FOR MARKETING')
    console.log('-'.repeat(40))
    
    // Get customer statistics
    const { data: customerStats, error: statsError } = await supabase
      .from('customers')
      .select('total_spent, total_visits, is_active, vip_status, created_at')
    
    if (!statsError && customerStats) {
      const stats = {
        total_customers: customerStats.length,
        active_customers: customerStats.filter(c => c.is_active).length,
        vip_customers: customerStats.filter(c => c.vip_status).length,
        total_revenue: customerStats.reduce((sum, c) => sum + (c.total_spent || 0), 0),
        average_spent: customerStats.length > 0 ? 
          customerStats.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customerStats.length : 0,
        average_visits: customerStats.length > 0 ?
          customerStats.reduce((sum, c) => sum + (c.total_visits || 0), 0) / customerStats.length : 0
      }
      
      console.log('📊 Customer Database Marketing Insights:')
      console.log(`  - Total customers: ${stats.total_customers}`)
      console.log(`  - Active customers: ${stats.active_customers}`)
      console.log(`  - VIP customers: ${stats.vip_customers}`)
      console.log(`  - Total revenue: $${stats.total_revenue.toFixed(2)}`)
      console.log(`  - Average customer value: $${stats.average_spent.toFixed(2)}`)
      console.log(`  - Average visits per customer: ${stats.average_visits.toFixed(1)}`)
      
      // Marketing segments
      const highValue = customerStats.filter(c => (c.total_spent || 0) > 500).length
      const regular = customerStats.filter(c => (c.total_spent || 0) > 100 && (c.total_spent || 0) <= 500).length
      const newCustomers = customerStats.filter(c => (c.total_spent || 0) <= 100).length
      
      console.log('\n🎯 Marketing Segments:')
      console.log(`  - High Value (>$500): ${highValue} customers`)
      console.log(`  - Regular ($100-$500): ${regular} customers`)
      console.log(`  - New/Low Value (<$100): ${newCustomers} customers`)
    }
    
    console.log('\n🎉 Customer Operations Test Complete!')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Fatal error during customer operations test:', error)
  }
}

// Run the test
testCustomerOperations().catch(console.error)