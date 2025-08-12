#!/usr/bin/env node

/**
 * Seed Marketing Billing Data
 * 
 * Creates test data for marketing billing system including:
 * - Billing accounts
 * - Payment methods
 * - Campaign billing records
 * - Sample transactions
 */

const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function seedBillingData() {
  console.log('🌱 Starting marketing billing data seed...')

  try {
    // 1. Create test billing accounts
    console.log('\n📋 Creating billing accounts...')
    const accounts = [
      {
        id: uuidv4(),
        owner_id: 'test-user-001',
        owner_type: 'shop',
        barbershop_id: 'shop-001',
        account_name: 'Elite Cuts Marketing',
        description: 'Primary marketing account for Elite Cuts Barbershop',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com',
        sendgrid_from_name: 'Elite Cuts',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'billing@elitecuts.com',
        monthly_spend_limit: 5000.00,
        daily_send_limit: 10000,
        require_approval_above: 500.00,
        is_active: true,
        is_verified: true,
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        total_campaigns_sent: 25,
        total_emails_sent: 12500,
        total_sms_sent: 3200,
        total_spent: 485.75,
        last_used_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        id: uuidv4(),
        owner_id: 'test-user-002',
        owner_type: 'enterprise',
        enterprise_id: 'enterprise-001',
        account_name: 'Premium Barber Group',
        description: 'Enterprise account for multi-location marketing',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'marketing@premiumbarbers.com',
        sendgrid_from_name: 'Premium Barbers',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'finance@premiumbarbers.com',
        monthly_spend_limit: 20000.00,
        daily_send_limit: 50000,
        require_approval_above: 2000.00,
        is_active: true,
        is_verified: true,
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        total_campaigns_sent: 150,
        total_emails_sent: 125000,
        total_sms_sent: 45000,
        total_spent: 8750.50,
        last_used_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Yesterday
      },
      {
        id: uuidv4(),
        owner_id: 'test-user-003',
        owner_type: 'barber',
        barbershop_id: 'shop-002',
        account_name: 'Mike\'s Personal Marketing',
        description: 'Individual barber marketing account',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'mike@barbershop.com',
        sendgrid_from_name: 'Mike the Barber',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'mike@example.com',
        monthly_spend_limit: 500.00,
        daily_send_limit: 1000,
        require_approval_above: 100.00,
        is_active: true,
        is_verified: false,
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        total_campaigns_sent: 5,
        total_emails_sent: 500,
        total_sms_sent: 150,
        total_spent: 25.50
      }
    ]

    for (const account of accounts) {
      const { error } = await supabase
        .from('marketing_accounts')
        .upsert(account, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating account ${account.account_name}:`, error.message)
      } else {
        console.log(`✅ Created account: ${account.account_name}`)
      }
    }

    // 2. Create test payment methods
    console.log('\n💳 Creating payment methods...')
    const paymentMethods = [
      {
        id: uuidv4(),
        account_id: accounts[0].id,
        stripe_payment_method_id: 'pm_test_' + Math.random().toString(36).substring(7),
        stripe_customer_id: 'cus_test_' + Math.random().toString(36).substring(7),
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2026,
        is_default: true,
        is_active: true
      },
      {
        id: uuidv4(),
        account_id: accounts[0].id,
        stripe_payment_method_id: 'pm_test_' + Math.random().toString(36).substring(7),
        stripe_customer_id: 'cus_test_' + Math.random().toString(36).substring(7),
        card_brand: 'mastercard',
        card_last4: '5555',
        card_exp_month: 6,
        card_exp_year: 2025,
        is_default: false,
        is_active: true
      },
      {
        id: uuidv4(),
        account_id: accounts[1].id,
        stripe_payment_method_id: 'pm_test_' + Math.random().toString(36).substring(7),
        stripe_customer_id: 'cus_test_' + Math.random().toString(36).substring(7),
        card_brand: 'amex',
        card_last4: '0005',
        card_exp_month: 3,
        card_exp_year: 2027,
        is_default: true,
        is_active: true
      }
    ]

    for (const method of paymentMethods) {
      const { error } = await supabase
        .from('marketing_payment_methods')
        .upsert(method, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating payment method:`, error.message)
      } else {
        console.log(`✅ Created payment method: ${method.card_brand} ****${method.card_last4}`)
      }
    }

    // 3. Create test campaigns
    console.log('\n📧 Creating test campaigns...')
    const campaigns = [
      {
        id: uuidv4(),
        created_by: 'test-user-001',
        billing_account_id: accounts[0].id,
        name: 'Summer Special Promotion',
        description: 'Get 25% off all services this summer',
        type: 'email',
        status: 'completed',
        subject: '☀️ Summer Special: 25% Off All Services!',
        message: '<h1>Summer is here!</h1><p>Book your appointment today and save 25%</p>',
        from_email: accounts[0].sendgrid_from_email,
        from_name: accounts[0].sendgrid_from_name,
        audience_type: 'segment',
        audience_filters: { segment: 'vip' },
        audience_count: 250,
        estimated_cost: 0.60,
        final_cost: 0.60,
        platform_fee: 0.10,
        service_cost: 0.50,
        total_sent: 250,
        total_delivered: 245,
        total_opened: 125,
        total_clicked: 45,
        delivery_rate: 0.98,
        open_rate: 0.51,
        click_rate: 0.18,
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
      },
      {
        id: uuidv4(),
        created_by: 'test-user-001',
        billing_account_id: accounts[0].id,
        name: 'Appointment Reminder SMS',
        type: 'sms',
        status: 'completed',
        message: 'Hi! This is a reminder about your appointment tomorrow at 2 PM. Reply CONFIRM to confirm.',
        audience_type: 'segment',
        audience_filters: { segment: 'tomorrow_appointments' },
        audience_count: 45,
        estimated_cost: 0.56,
        final_cost: 0.56,
        platform_fee: 0.11,
        service_cost: 0.45,
        total_sent: 45,
        total_delivered: 44,
        delivery_rate: 0.98,
        started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 600000).toISOString()
      },
      {
        id: uuidv4(),
        created_by: 'test-user-002',
        billing_account_id: accounts[1].id,
        name: 'Grand Opening Announcement',
        type: 'email',
        status: 'scheduled',
        subject: '🎉 Grand Opening of Our New Location!',
        message: '<h1>We\'re expanding!</h1><p>Join us for the grand opening celebration</p>',
        from_email: accounts[1].sendgrid_from_email,
        from_name: accounts[1].sendgrid_from_name,
        audience_type: 'all',
        audience_filters: {},
        audience_count: 5000,
        estimated_cost: 12.00,
        scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    for (const campaign of campaigns) {
      const { error } = await supabase
        .from('marketing_campaigns')
        .upsert(campaign, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating campaign ${campaign.name}:`, error.message)
      } else {
        console.log(`✅ Created campaign: ${campaign.name}`)
      }
    }

    // 4. Create billing records
    console.log('\n💰 Creating billing records...')
    const billingRecords = [
      {
        id: uuidv4(),
        campaign_id: campaigns[0].id,
        billing_account_id: accounts[0].id,
        stripe_payment_intent_id: 'pi_test_' + Math.random().toString(36).substring(7),
        stripe_charge_id: 'ch_test_' + Math.random().toString(36).substring(7),
        payment_status: 'succeeded',
        amount_charged: 0.60,
        platform_fee: 0.10,
        service_cost: 0.50,
        recipients_count: 250,
        sent_count: 250,
        delivered_count: 245,
        failed_count: 5,
        billing_period: new Date().toISOString().substring(0, 7),
        invoice_id: 'INV-001',
        receipt_url: 'https://stripe.com/receipt/test',
        status: 'active',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        campaign_id: campaigns[1].id,
        billing_account_id: accounts[0].id,
        stripe_payment_intent_id: 'pi_test_' + Math.random().toString(36).substring(7),
        stripe_charge_id: 'ch_test_' + Math.random().toString(36).substring(7),
        payment_status: 'succeeded',
        amount_charged: 0.56,
        platform_fee: 0.11,
        service_cost: 0.45,
        recipients_count: 45,
        sent_count: 45,
        delivered_count: 44,
        failed_count: 1,
        billing_period: new Date().toISOString().substring(0, 7),
        invoice_id: 'INV-002',
        receipt_url: 'https://stripe.com/receipt/test2',
        status: 'active',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    for (const record of billingRecords) {
      const { error } = await supabase
        .from('marketing_billing_records')
        .upsert(record, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating billing record:`, error.message)
      } else {
        console.log(`✅ Created billing record for campaign: ${record.campaign_id}`)
      }
    }

    // 5. Create customer segments
    console.log('\n👥 Creating customer segments...')
    const segments = [
      {
        id: uuidv4(),
        created_by: 'test-user-001',
        barbershop_id: 'shop-001',
        name: 'VIP Customers',
        description: 'Customers who visit more than 2 times per month',
        segment_type: 'dynamic',
        criteria: {
          visit_frequency: { operator: '>', value: 2, period: 'month' },
          status: 'active'
        },
        customer_count: 250,
        email_count: 240,
        sms_count: 225,
        is_active: true,
        auto_update: true,
        update_frequency: 24,
        campaigns_sent: 5,
        last_used_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        created_by: 'test-user-001',
        barbershop_id: 'shop-001',
        name: 'New Customers',
        description: 'Customers who joined in the last 30 days',
        segment_type: 'dynamic',
        criteria: {
          created_at: { operator: '>', value: 30, unit: 'days' },
          status: 'active'
        },
        customer_count: 85,
        email_count: 80,
        sms_count: 75,
        is_active: true,
        auto_update: true,
        update_frequency: 12,
        campaigns_sent: 2
      },
      {
        id: uuidv4(),
        created_by: 'test-user-002',
        enterprise_id: 'enterprise-001',
        name: 'All Enterprise Customers',
        description: 'All customers across all locations',
        segment_type: 'static',
        criteria: {
          enterprise_id: 'enterprise-001'
        },
        customer_count: 5000,
        email_count: 4800,
        sms_count: 4500,
        is_active: true,
        auto_update: false,
        visibility: 'enterprise',
        campaigns_sent: 10
      }
    ]

    for (const segment of segments) {
      const { error } = await supabase
        .from('customer_segments')
        .upsert(segment, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating segment ${segment.name}:`, error.message)
      } else {
        console.log(`✅ Created segment: ${segment.name}`)
      }
    }

    console.log('\n✨ Marketing billing data seed completed successfully!')
    
    // Display summary
    console.log('\n📊 Summary:')
    console.log(`   - ${accounts.length} billing accounts created`)
    console.log(`   - ${paymentMethods.length} payment methods added`)
    console.log(`   - ${campaigns.length} test campaigns created`)
    console.log(`   - ${billingRecords.length} billing records generated`)
    console.log(`   - ${segments.length} customer segments configured`)
    
    console.log('\n🚀 You can now test the campaign billing page at:')
    console.log('   http://localhost:9999/dashboard/campaigns/billing')

  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

// Run the seed function
seedBillingData().catch(console.error)