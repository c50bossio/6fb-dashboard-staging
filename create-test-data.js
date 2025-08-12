#!/usr/bin/env node

/**
 * Create minimal test data for billing
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function createTestData() {
  console.log('📦 Creating minimal test data...')

  try {
    // Create test account
    console.log('1. Creating marketing account...')
    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .insert({
        owner_id: 'test-user-001',
        owner_type: 'shop',
        account_name: 'Elite Cuts Marketing',
        description: 'Primary marketing account',
        monthly_spend_limit: 500.00,
        is_active: true,
        is_verified: true,
        total_spent: 45.50
      })
      .select()
      .single()

    if (accountError) {
      console.log('❌ Account error:', accountError.message)
      return
    }

    console.log('✅ Created account:', account.id)

    // Create payment method
    console.log('2. Creating payment method...')
    const { data: paymentMethod, error: paymentError } = await supabase
      .from('marketing_payment_methods')
      .insert({
        account_id: account.id,
        stripe_payment_method_id: 'pm_test_123456',
        stripe_customer_id: 'cus_test_123456',
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2025,
        is_default: true,
        is_active: true
      })
      .select()
      .single()

    if (paymentError) {
      console.log('❌ Payment method error:', paymentError.message)
    } else {
      console.log('✅ Created payment method:', paymentMethod.id)
    }

    // Create test campaign
    console.log('3. Creating campaign...')
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .insert({
        created_by: 'test-user-001',
        billing_account_id: account.id,
        name: 'Summer Special',
        type: 'email',
        status: 'completed',
        subject: '25% Off Summer Special',
        message: 'Get 25% off all services this summer!',
        audience_type: 'segment',
        audience_filters: { segment: 'all' },
        audience_count: 150,
        estimated_cost: 0.30,
        final_cost: 0.30,
        total_sent: 150,
        total_delivered: 148
      })
      .select()
      .single()

    if (campaignError) {
      console.log('❌ Campaign error:', campaignError.message)
    } else {
      console.log('✅ Created campaign:', campaign.id)

      // Create billing record
      console.log('4. Creating billing record...')
      const { data: billing, error: billingError } = await supabase
        .from('marketing_billing_records')
        .insert({
          campaign_id: campaign.id,
          billing_account_id: account.id,
          payment_status: 'succeeded',
          amount_charged: 0.30,
          platform_fee: 0.05,
          service_cost: 0.25,
          recipients_count: 150,
          sent_count: 150,
          delivered_count: 148
        })
        .select()
        .single()

      if (billingError) {
        console.log('❌ Billing error:', billingError.message)
      } else {
        console.log('✅ Created billing record:', billing.id)
      }
    }

    console.log('\n🎉 Test data created successfully!')
    console.log('You can now test the billing functionality.')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTestData().catch(console.error)