#!/usr/bin/env node

/**
 * Multi-Role Billing Data Seed Script
 * 
 * Creates comprehensive test data for all barbershop roles:
 * - Individual Barbers: Personal marketing accounts
 * - Shop Owners: Barbershop-wide billing 
 * - Enterprise Owners: Multi-location billing
 * 
 * This script populates:
 * 1. User profiles for each role type
 * 2. Marketing billing accounts
 * 3. Payment methods  
 * 4. Sample billing history/transactions
 */

const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function seedMultiRoleBillingData() {
  console.log('🌱 Starting multi-role billing data seed...')
  console.log('📋 This will create test data for barbers, shops, and enterprises\n')

  try {
    // ===============================================
    // STEP 1: CREATE USER PROFILES FOR EACH ROLE
    // ===============================================
    console.log('👤 Creating user profiles for each role...')
    
    const userProfiles = [
      // Individual Barber
      {
        id: 'barber-mike-001',
        email: 'mike@elitecuts.com',
        role: 'BARBER',
        first_name: 'Mike',
        last_name: 'Johnson',
        full_name: 'Mike Johnson',
        shop_id: 'shop-elite-cuts',
        phone: '+1-555-123-4567',
        profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        bio: 'Professional barber with 8 years experience specializing in fades and beard work',
        specialties: ['Fades', 'Beard Styling', 'Classic Cuts'],
        hourly_rate: 45.00,
        commission_rate: 0.60,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Shop Owner
      {
        id: 'shop-owner-alex-001', 
        email: 'alex@elitecuts.com',
        role: 'SHOP_OWNER',
        first_name: 'Alex',
        last_name: 'Rodriguez',
        full_name: 'Alex Rodriguez',
        shop_id: 'shop-elite-cuts',
        phone: '+1-555-234-5678',
        profile_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Owner of Elite Cuts, passionate about creating the best barbershop experience',
        business_name: 'Elite Cuts Barbershop',
        business_address: '123 Main St, Downtown City, CA 90210',
        business_phone: '+1-555-ELITE-1',
        tax_id: 'EIN-12-3456789',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Enterprise Owner
      {
        id: 'enterprise-sarah-001',
        email: 'sarah@cutspro.com',
        role: 'ENTERPRISE_OWNER',
        first_name: 'Sarah',
        last_name: 'Williams',
        full_name: 'Sarah Williams',
        enterprise_id: 'enterprise-cuts-pro',
        phone: '+1-555-345-6789',
        profile_image_url: 'https://images.unsplash.com/photo-1494790108755-2616b332e639?w=150&h=150&fit=crop&crop=face',
        bio: 'CEO of CutsPro Enterprise - 15+ barbershop locations across 3 states',
        business_name: 'CutsPro Enterprise',
        business_address: '456 Business Blvd, Corporate City, NY 10001',
        business_phone: '+1-555-CUTS-PRO',
        tax_id: 'EIN-98-7654321',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // Insert user profiles
    for (const profile of userProfiles) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating profile for ${profile.email}:`, error.message)
      } else {
        console.log(`✅ Created ${profile.role} profile: ${profile.email}`)
      }
    }

    // ===============================================
    // STEP 2: CREATE MARKETING ACCOUNTS FOR EACH ROLE
    // ===============================================
    console.log('\n💳 Creating marketing billing accounts...')
    
    const marketingAccounts = [
      // Individual Barber Account
      {
        id: uuidv4(),
        owner_id: 'barber-mike-001',
        owner_type: 'barber',
        barbershop_id: 'shop-elite-cuts',
        account_name: 'Mike Johnson Personal Marketing',
        description: 'Personal marketing account for Mike Johnson - individual barber services',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'mike@elitecuts.com',
        sendgrid_from_name: 'Mike Johnson - Elite Cuts',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'mike@elitecuts.com',
        monthly_spend_limit: 500.00,
        daily_send_limit: 1000,
        require_approval_above: 50.00,
        is_active: true,
        is_verified: true,
        verification_method: 'email',
        verified_at: new Date().toISOString(),
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        total_campaigns_sent: 12,
        total_emails_sent: 850,
        total_sms_sent: 245,
        total_spent: 127.50,
        last_used_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        updated_at: new Date().toISOString()
      },
      // Shop Owner Account
      {
        id: uuidv4(),
        owner_id: 'shop-owner-alex-001',
        owner_type: 'shop',
        barbershop_id: 'shop-elite-cuts',
        account_name: 'Elite Cuts Barbershop Marketing',
        description: 'Main marketing account for Elite Cuts Barbershop - all shop promotions and customer outreach',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'marketing@elitecuts.com',
        sendgrid_from_name: 'Elite Cuts Barbershop',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'alex@elitecuts.com',
        monthly_spend_limit: 2500.00,
        daily_send_limit: 5000,
        require_approval_above: 200.00,
        is_active: true,
        is_verified: true,
        verification_method: 'phone',
        verified_at: new Date().toISOString(),
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        company_address: '123 Main St, Downtown City, CA 90210',
        total_campaigns_sent: 45,
        total_emails_sent: 8750,
        total_sms_sent: 1200,
        total_spent: 465.75,
        last_used_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        updated_at: new Date().toISOString()
      },
      // Enterprise Account
      {
        id: uuidv4(),
        owner_id: 'enterprise-sarah-001',
        owner_type: 'enterprise',
        enterprise_id: 'enterprise-cuts-pro',
        account_name: 'CutsPro Enterprise Marketing Hub',
        description: 'Enterprise-wide marketing account managing campaigns across 15+ locations',
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'marketing@cutspro.com',
        sendgrid_from_name: 'CutsPro Barbershops',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '+18135483884',
        billing_email: 'sarah@cutspro.com',
        monthly_spend_limit: 10000.00,
        daily_send_limit: 25000,
        require_approval_above: 1000.00,
        is_active: true,
        is_verified: true,
        verification_method: 'business',
        verified_at: new Date().toISOString(),
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        company_address: '456 Business Blvd, Corporate City, NY 10001',
        total_campaigns_sent: 125,
        total_emails_sent: 45000,
        total_sms_sent: 8500,
        total_spent: 2850.25,
        last_used_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
        updated_at: new Date().toISOString()
      }
    ]

    // Insert marketing accounts
    const createdAccounts = []
    for (const account of marketingAccounts) {
      const { data, error } = await supabase
        .from('marketing_accounts')
        .upsert(account, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
        console.error(`❌ Error creating marketing account for ${account.owner_type}:`, error.message)
      } else {
        console.log(`✅ Created ${account.owner_type} marketing account: ${account.account_name}`)
        createdAccounts.push(data || account)
      }
    }

    // ===============================================
    // STEP 3: CREATE SAMPLE PAYMENT METHODS
    // ===============================================
    console.log('\n💳 Creating sample payment methods...')
    
    const paymentMethods = [
      // Barber Payment Method
      {
        id: uuidv4(),
        account_id: createdAccounts[0]?.id,
        stripe_payment_method_id: 'pm_barber_mike_visa_4242',
        stripe_customer_id: 'cus_barber_mike_001',
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2026,
        is_default: true,
        is_active: true,
        billing_address: {
          line1: '789 Barber Lane',
          city: 'Downtown City',
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        },
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      // Shop Owner Payment Method
      {
        id: uuidv4(),
        account_id: createdAccounts[1]?.id,
        stripe_payment_method_id: 'pm_shop_alex_mastercard_5555',
        stripe_customer_id: 'cus_shop_alex_001',
        card_brand: 'mastercard',
        card_last4: '5555',
        card_exp_month: 8,
        card_exp_year: 2027,
        is_default: true,
        is_active: true,
        billing_address: {
          line1: '123 Main St',
          city: 'Downtown City', 
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        },
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      // Enterprise Payment Method (Primary)
      {
        id: uuidv4(),
        account_id: createdAccounts[2]?.id,
        stripe_payment_method_id: 'pm_enterprise_sarah_amex_1005',
        stripe_customer_id: 'cus_enterprise_sarah_001',
        card_brand: 'amex',
        card_last4: '1005',
        card_exp_month: 3,
        card_exp_year: 2028,
        is_default: true,
        is_active: true,
        billing_address: {
          line1: '456 Business Blvd',
          city: 'Corporate City',
          state: 'NY', 
          postal_code: '10001',
          country: 'US'
        },
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      // Enterprise Payment Method (Backup)
      {
        id: uuidv4(),
        account_id: createdAccounts[2]?.id,
        stripe_payment_method_id: 'pm_enterprise_sarah_visa_4444',
        stripe_customer_id: 'cus_enterprise_sarah_001',
        card_brand: 'visa',
        card_last4: '4444',
        card_exp_month: 11,
        card_exp_year: 2026,
        is_default: false,
        is_active: true,
        billing_address: {
          line1: '456 Business Blvd',
          city: 'Corporate City',
          state: 'NY',
          postal_code: '10001', 
          country: 'US'
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // Insert payment methods
    for (const paymentMethod of paymentMethods) {
      if (paymentMethod.account_id) {
        const { data, error } = await supabase
          .from('marketing_payment_methods')
          .upsert(paymentMethod, { onConflict: 'id' })

        if (error) {
          console.error(`❌ Error creating payment method:`, error.message)
        } else {
          console.log(`✅ Created payment method: ${paymentMethod.card_brand} •••• ${paymentMethod.card_last4}`)
        }
      }
    }

    // ===============================================
    // STEP 4: CREATE SAMPLE CAMPAIGNS & BILLING RECORDS
    // ===============================================
    console.log('\n📧 Creating sample marketing campaigns and billing records...')
    
    // Create sample campaigns first
    const sampleCampaigns = [
      // Barber Campaigns
      {
        id: uuidv4(),
        created_by: 'barber-mike-001',
        billing_account_id: createdAccounts[0]?.id,
        name: 'Mike\'s Weekend Special - Fade + Beard',
        description: 'Personal promotion for weekend appointments',
        type: 'email',
        status: 'completed',
        subject: '🔥 Weekend Special: Fade + Beard Styling $60',
        message: 'Book your weekend appointment with Mike for a fresh fade and professional beard styling!',
        audience_type: 'segment',
        audience_count: 85,
        estimated_cost: 12.75,
        final_cost: 12.75,
        platform_fee: 2.55,
        service_cost: 10.20,
        total_sent: 85,
        total_delivered: 82,
        total_opened: 28,
        total_clicked: 12,
        delivery_rate: 0.9647,
        open_rate: 0.3415,
        click_rate: 0.1463,
        success_rate: 0.9647,
        started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      // Shop Campaigns
      {
        id: uuidv4(),
        created_by: 'shop-owner-alex-001',
        billing_account_id: createdAccounts[1]?.id,
        name: 'Elite Cuts Monthly Newsletter',
        description: 'Monthly customer newsletter with promotions and updates',
        type: 'email',
        status: 'completed',
        subject: '📰 August Newsletter - New Services & Special Offers',
        message: 'Check out our new beard oil line and book your August appointment with 15% off!',
        audience_type: 'all',
        audience_count: 1250,
        estimated_cost: 62.50,
        final_cost: 62.50,
        platform_fee: 12.50,
        service_cost: 50.00,
        total_sent: 1250,
        total_delivered: 1198,
        total_opened: 456,
        total_clicked: 89,
        delivery_rate: 0.9584,
        open_rate: 0.3808,
        click_rate: 0.0742,
        success_rate: 0.9584,
        started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      // Enterprise Campaigns
      {
        id: uuidv4(),
        created_by: 'enterprise-sarah-001',
        billing_account_id: createdAccounts[2]?.id,
        name: 'CutsPro Back-to-School Campaign',
        description: 'Multi-location back-to-school promotion across all CutsPro locations',
        type: 'email',
        status: 'completed',
        subject: '📚 Back to School Fresh Cuts - 20% Off Student Cuts',
        message: 'Get ready for the new school year! Students save 20% at any CutsPro location.',
        audience_type: 'segment',
        audience_count: 8500,
        estimated_cost: 425.00,
        final_cost: 425.00,
        platform_fee: 85.00,
        service_cost: 340.00,
        total_sent: 8500,
        total_delivered: 8245,
        total_opened: 2891,
        total_clicked: 567,
        delivery_rate: 0.9700,
        open_rate: 0.3506,
        click_rate: 0.0688,
        success_rate: 0.9700,
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // Insert campaigns
    const createdCampaigns = []
    for (const campaign of sampleCampaigns) {
      if (campaign.billing_account_id) {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .upsert(campaign, { onConflict: 'id' })
          .select()
          .single()

        if (error) {
          console.error(`❌ Error creating campaign:`, error.message)
        } else {
          console.log(`✅ Created campaign: ${campaign.name}`)
          createdCampaigns.push(data || campaign)
        }
      }
    }

    // Create billing records for campaigns
    console.log('\n💰 Creating billing transaction records...')
    
    const billingRecords = []
    
    createdCampaigns.forEach((campaign, index) => {
      billingRecords.push({
        id: uuidv4(),
        campaign_id: campaign.id,
        billing_account_id: campaign.billing_account_id,
        stripe_payment_intent_id: `pi_billing_${index + 1}_${Date.now()}`,
        payment_status: 'succeeded',
        amount_charged: campaign.final_cost,
        platform_fee: campaign.platform_fee,
        service_cost: campaign.service_cost,
        recipients_count: campaign.audience_count,
        sent_count: campaign.total_sent,
        delivered_count: campaign.total_delivered,
        failed_count: campaign.total_sent - campaign.total_delivered,
        billing_period: new Date().toISOString().substring(0, 7), // YYYY-MM format
        invoice_id: `inv_${campaign.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        receipt_url: `https://dashboard.stripe.com/receipts/${index + 1}`,
        status: 'active',
        created_at: campaign.completed_at,
        updated_at: new Date().toISOString()
      })
    })

    // Insert billing records
    for (const record of billingRecords) {
      const { data, error } = await supabase
        .from('marketing_billing_records')
        .upsert(record, { onConflict: 'id' })

      if (error) {
        console.error(`❌ Error creating billing record:`, error.message)
      } else {
        console.log(`✅ Created billing record: $${record.amount_charged} for ${record.recipients_count} recipients`)
      }
    }

    // ===============================================
    // FINAL SUMMARY
    // ===============================================
    console.log('\n✨ Multi-role billing data seed completed!')
    console.log('\n📊 SUMMARY:')
    console.log(`👤 User Profiles: ${userProfiles.length} created`)
    console.log(`💳 Marketing Accounts: ${createdAccounts.length} created`)
    console.log(`💳 Payment Methods: ${paymentMethods.length} created`)
    console.log(`📧 Sample Campaigns: ${createdCampaigns.length} created`)
    console.log(`💰 Billing Records: ${billingRecords.length} created`)
    
    console.log('\n🎯 TEST USERS:')
    userProfiles.forEach(user => {
      console.log(`  ${user.role}: ${user.email} (ID: ${user.id})`)
    })
    
    console.log('\n🔗 Next Steps:')
    console.log('1. Login as any test user to see role-specific billing data')
    console.log('2. Visit /dashboard/campaigns to see the billing section populated')
    console.log('3. Each role will show appropriate billing scope and permissions')

  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

// Execute the seed
if (require.main === module) {
  seedMultiRoleBillingData().catch(console.error)
}

module.exports = { seedMultiRoleBillingData }