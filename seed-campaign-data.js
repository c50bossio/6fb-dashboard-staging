#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCampaignData() {
  console.log('🌱 Seeding campaign data...\n');
  
  const { data: accounts, error: accountError } = await supabase
    .from('marketing_accounts')
    .select('*')
    .limit(1);
  
  if (accountError || !accounts || accounts.length === 0) {
    console.error('❌ No marketing accounts found. Please run seed-billing-data.js first');
    return;
  }
  
  const account = accounts[0];
  console.log('Using account:', account.account_name);
  
  const campaigns = [
    {
      account_id: account.id,
      owner_id: account.owner_id,
      shop_id: account.barbershop_id || null,
      name: 'Welcome Series',
      type: 'email',
      status: 'completed',
      subject: 'Welcome to Elite Cuts Barbershop!',
      message: 'Thank you for choosing us for your grooming needs. Enjoy 15% off your first visit!',
      template_id: 'template-welcome-001',
      audience_type: 'new_customers',
      audience_filter: JSON.stringify({ 
        created_after: '2024-01-01',
        visits: 0 
      }),
      audience_count: 125,
      scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      analytics: JSON.stringify({
        total_sent: 125,
        delivered: 120,
        opened: 82,
        clicked: 31,
        bounced: 5,
        unsubscribed: 2,
        open_rate: 0.68,
        click_rate: 0.26
      }),
      cost_per_recipient: 0.02,
      total_cost: 2.50,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      account_id: account.id,
      owner_id: account.owner_id,
      shop_id: account.barbershop_id || null,
      name: 'Holiday Special',
      type: 'sms',
      status: 'active',
      subject: '🎄 Holiday Special!',
      message: 'Get 25% off all services this week! Book now at elitecuts.com/book. Reply STOP to opt out.',
      audience_type: 'all_customers',
      audience_filter: JSON.stringify({ 
        sms_opted_in: true,
        last_visit_days: 30 
      }),
      audience_count: 87,
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      analytics: JSON.stringify({
        estimated_delivery: 87,
        estimated_cost: 4.35
      }),
      cost_per_recipient: 0.05,
      total_cost: 4.35,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      account_id: account.id,
      owner_id: account.owner_id,
      shop_id: account.barbershop_id || null,
      name: 'Birthday Rewards',
      type: 'email',
      status: 'draft',
      subject: '🎂 Happy Birthday from Elite Cuts!',
      message: 'Celebrate your special day with a FREE beard trim with any haircut. Valid all month!',
      template_id: 'template-birthday-001',
      audience_type: 'birthday_month',
      audience_filter: JSON.stringify({ 
        birthday_month: new Date().getMonth() + 1
      }),
      audience_count: 34,
      cost_per_recipient: 0.02,
      total_cost: 0.68,
      created_at: new Date().toISOString()
    }
  ];
  
  console.log('\n📝 Creating campaigns...');
  
  for (const campaign of campaigns) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert(campaign)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating campaign:', campaign.name, '-', error.message);
    } else {
      console.log('✅ Created campaign:', campaign.name, `(${campaign.type}, ${campaign.status})`);
    }
  }
  
  const completedCampaign = campaigns.find(c => c.status === 'completed');
  if (completedCampaign) {
    const billingRecord = {
      account_id: account.id,
      campaign_id: null, // Will be set if campaign was created successfully
      campaign_type: completedCampaign.type,
      amount_charged: completedCampaign.total_cost,
      platform_fee: completedCampaign.total_cost * 0.2, // 20% platform fee
      service_cost: completedCampaign.total_cost * 0.8,
      recipients_count: completedCampaign.audience_count,
      sent_count: 125,
      delivered_count: 120,
      payment_status: 'succeeded',
      stripe_charge_id: 'ch_demo_' + Date.now(),
      created_at: completedCampaign.sent_at
    };
    
    const { error: billingError } = await supabase
      .from('marketing_billing_records')
      .insert(billingRecord);
    
    if (billingError) {
      console.error('❌ Error creating billing record:', billingError.message);
    } else {
      console.log('✅ Created billing record for completed campaign');
    }
  }
  
  const { count } = await supabase
    .from('marketing_campaigns')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📊 Summary:');
  console.log(`   Total campaigns in database: ${count || 0}`);
  console.log('   Campaign types: Email (2), SMS (1)');
  console.log('   Statuses: Completed (1), Active (1), Draft (1)');
  console.log('\n🎉 Campaign data seeded successfully!');
  console.log('\n🚀 Refresh the page to see the campaigns:');
  console.log('   http://localhost:9999/dashboard/campaigns');
}

seedCampaignData().catch(console.error);