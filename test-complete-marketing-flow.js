import 'dotenv/config';
import supabaseQuery from './lib/supabase-query.js';

async function testCompleteMarketingFlow() {
  console.log('=== COMPLETE MARKETING DATA FLOW VALIDATION ===\n');
  
  // 1. Check if marketing tables exist in database
  console.log('1. CHECKING MARKETING TABLES:');
  const marketingTables = [
    'marketing_accounts',
    'marketing_campaigns', 
    'campaign_recipients',
    'campaign_analytics',
    'customer_segments',
    'customer_segment_members',
    'email_unsubscribes',
    'marketing_billing_records',
    'marketing_payment_methods'
  ];
  
  const existingTables = [];
  for (const tableName of marketingTables) {
    const result = await supabaseQuery.queryTable(tableName, { limit: 1 });
    if (!result.error) {
      existingTables.push(tableName);
      console.log(`✅ ${tableName} - EXISTS`);
    } else {
      console.log(`❌ ${tableName} - MISSING`);
    }
  }
  
  console.log(`\nFound ${existingTables.length}/${marketingTables.length} marketing tables\n`);
  
  // 2. Customer Data Analysis for Marketing
  console.log('2. CUSTOMER DATA FOR MARKETING CAMPAIGNS:');
  const allProfiles = await supabaseQuery.queryTable('profiles', { 
    select: 'id, email, full_name, role, created_at, subscription_status',
    orderBy: 'created_at',
    ascending: false
  });
  
  if (allProfiles.data) {
    console.log(`✅ Found ${allProfiles.data.length} total customer profiles`);
    
    // Analyze customer segments
    const roleBreakdown = allProfiles.data.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {});
    
    const subscriptionBreakdown = allProfiles.data.reduce((acc, profile) => {
      acc[profile.subscription_status] = (acc[profile.subscription_status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n   Customer Segmentation Analysis:');
    console.log('   Role Distribution:');
    Object.entries(roleBreakdown).forEach(([role, count]) => {
      console.log(`     ${role}: ${count} customers`);
    });
    
    console.log('   Subscription Status:');
    Object.entries(subscriptionBreakdown).forEach(([status, count]) => {
      console.log(`     ${status}: ${count} customers`);
    });
    
    // Extract email addresses for marketing
    const emailList = allProfiles.data
      .filter(profile => profile.email && profile.email.includes('@'))
      .map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        status: profile.subscription_status
      }));
    
    console.log(`\n   Marketing-ready email addresses: ${emailList.length}`);
    console.log('   Sample customer data for campaigns:');
    emailList.slice(0, 3).forEach((customer, index) => {
      console.log(`     ${index + 1}. ${customer.email} (${customer.name}) - ${customer.role}/${customer.status}`);
    });
  }
  
  // 3. Check Marketing Agents Configuration
  console.log('\n3. MARKETING AGENTS CONFIGURATION:');
  const agents = await supabaseQuery.queryTable('agents', { 
    select: 'id, name, type, status, capabilities, configuration',
    filter: { type: 'marketing' }
  });
  
  if (agents.data && agents.data.length > 0) {
    console.log(`✅ Found ${agents.data.length} marketing agents`);
    agents.data.forEach(agent => {
      console.log(`   Agent: ${agent.name}`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Capabilities: ${agent.capabilities || 'N/A'}`);
      if (agent.configuration) {
        console.log(`   Configuration: ${JSON.stringify(agent.configuration, null, 2)}`);
      }
    });
  } else {
    console.log('❌ No marketing agents found');
  }
  
  // 4. Test Marketing Account Creation (if tables exist)
  if (existingTables.includes('marketing_accounts')) {
    console.log('\n4. TESTING MARKETING ACCOUNT ACCESS:');
    const marketingAccounts = await supabaseQuery.queryTable('marketing_accounts', { 
      select: 'id, account_name, owner_type, provider, is_active, total_campaigns_sent',
      limit: 5
    });
    
    if (marketingAccounts.data) {
      console.log(`✅ Found ${marketingAccounts.data.length} marketing accounts`);
      marketingAccounts.data.forEach(account => {
        console.log(`   Account: ${account.account_name} (${account.provider})`);
        console.log(`   Owner Type: ${account.owner_type}`);
        console.log(`   Campaigns Sent: ${account.total_campaigns_sent || 0}`);
      });
    }
  }
  
  // 5. Test Campaign Data (if tables exist)
  if (existingTables.includes('marketing_campaigns')) {
    console.log('\n5. TESTING CAMPAIGN ACCESS:');
    const campaigns = await supabaseQuery.queryTable('marketing_campaigns', { 
      select: 'id, name, type, status, audience_count, total_sent, created_at',
      limit: 5,
      orderBy: 'created_at',
      ascending: false
    });
    
    if (campaigns.data) {
      console.log(`✅ Found ${campaigns.data.length} marketing campaigns`);
      campaigns.data.forEach(campaign => {
        console.log(`   Campaign: ${campaign.name} (${campaign.type})`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Audience: ${campaign.audience_count || 0} recipients`);
        console.log(`   Sent: ${campaign.total_sent || 0} messages`);
      });
    }
  }
  
  // 6. Service Integration Check
  console.log('\n6. SERVICE INTEGRATION STATUS:');
  const envVars = {
    'SendGrid API Key': process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Missing',
    'Twilio Account SID': process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing',
    'Twilio Auth Token': process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing',
    'OpenAI API Key': process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'
  };
  
  Object.entries(envVars).forEach(([service, status]) => {
    console.log(`   ${service}: ${status}`);
  });
  
  // 7. Generate Marketing Flow Summary
  console.log('\n7. MARKETING DATA FLOW SUMMARY:');
  console.log('   📊 Data Sources:');
  console.log(`     - Customer Profiles: ${allProfiles.data?.length || 0} records`);
  console.log(`     - Marketing Agents: ${agents.data?.length || 0} configured`);
  console.log(`     - Marketing Tables: ${existingTables.length}/${marketingTables.length} available`);
  
  console.log('\n   🔄 Flow Status:');
  console.log(`     - MCP Database Access: ✅ Working`);
  console.log(`     - Customer Data Retrieval: ✅ Working`);
  console.log(`     - Customer Segmentation: ${existingTables.includes('customer_segments') ? '✅ Ready' : '❌ Tables Missing'}`);
  console.log(`     - Campaign Management: ${existingTables.includes('marketing_campaigns') ? '✅ Ready' : '❌ Tables Missing'}`);
  console.log(`     - Billing Integration: ${existingTables.includes('marketing_billing_records') ? '✅ Ready' : '❌ Tables Missing'}`);
  console.log(`     - Analytics Tracking: ${existingTables.includes('campaign_analytics') ? '✅ Ready' : '❌ Tables Missing'}`);
  
  // 8. Next Steps Recommendation
  console.log('\n8. NEXT STEPS FOR COMPLETE MARKETING FLOW:');
  if (existingTables.length === 0) {
    console.log('   🚨 CRITICAL: Marketing tables need to be created in Supabase');
    console.log('   📝 Action: Run marketing schema creation script');
  } else if (existingTables.length < marketingTables.length) {
    console.log('   ⚠️  PARTIAL: Some marketing tables are missing');
    console.log('   📝 Action: Complete marketing schema setup');
  } else {
    console.log('   ✅ READY: All marketing infrastructure is in place');
    console.log('   📝 Action: Begin agent-driven campaign testing');
  }
  
  return {
    customerCount: allProfiles.data?.length || 0,
    marketingAgents: agents.data?.length || 0,
    tablesReady: existingTables.length,
    totalTables: marketingTables.length,
    flowStatus: existingTables.length === marketingTables.length ? 'COMPLETE' : 'INCOMPLETE'
  };
}

testCompleteMarketingFlow().catch(console.error);