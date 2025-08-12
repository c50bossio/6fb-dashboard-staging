import 'dotenv/config';
import supabaseQuery from './lib/supabase-query.js';

async function analyzeExistingSchema() {
  console.log('=== EXISTING DATABASE SCHEMA ANALYSIS ===\n');
  
  // 1. Get profiles table schema
  console.log('1. PROFILES TABLE SCHEMA:');
  const profilesSchema = await supabaseQuery.getTableSchema('profiles');
  if (profilesSchema.data) {
    profilesSchema.data.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  } else if (profilesSchema.error) {
    console.log('Error getting profiles schema:', profilesSchema.error);
  }
  
  // 2. Get actual profiles data with correct columns
  console.log('\n2. CUSTOMER DATA (with correct columns):');
  const customers = await supabaseQuery.queryTable('profiles', { 
    select: 'id, email, full_name, role, created_at, updated_at',
    limit: 10 
  });
  
  if (customers.data) {
    console.log(`✅ Found ${customers.data.length} customer profiles`);
    customers.data.forEach((customer, index) => {
      console.log(`  Customer ${index + 1}:`);
      console.log(`    ID: ${customer.id}`);
      console.log(`    Email: ${customer.email}`);
      console.log(`    Name: ${customer.full_name || 'N/A'}`);
      console.log(`    Role: ${customer.role}`);
      console.log(`    Joined: ${new Date(customer.created_at).toLocaleDateString()}`);
      console.log(`    ---`);
    });
  } else {
    console.log('Error getting customer data:', customers.error);
  }
  
  // 3. Analyze analytics_events table
  console.log('\n3. ANALYTICS EVENTS TABLE SCHEMA:');
  const analyticsSchema = await supabaseQuery.getTableSchema('analytics_events');
  if (analyticsSchema.data) {
    analyticsSchema.data.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
  
  // 4. Get actual analytics data
  console.log('\n4. ANALYTICS EVENTS DATA:');
  const analytics = await supabaseQuery.queryTable('analytics_events', { 
    select: '*',
    limit: 5,
    orderBy: 'created_at',
    ascending: false
  });
  
  if (analytics.data) {
    console.log(`✅ Found ${analytics.data.length} analytics events`);
    analytics.data.forEach((event, index) => {
      console.log(`  Event ${index + 1}:`, JSON.stringify(event, null, 2));
    });
  } else {
    console.log('Error getting analytics data:', analytics.error);
  }
  
  // 5. Check notifications table schema 
  console.log('\n5. NOTIFICATIONS TABLE SCHEMA:');
  const notificationsSchema = await supabaseQuery.getTableSchema('notifications');
  if (notificationsSchema.data) {
    notificationsSchema.data.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }
  
  // 6. Check agents table for marketing agents
  console.log('\n6. MARKETING AGENTS:');
  const marketingAgents = await supabaseQuery.queryTable('agents', { 
    select: 'id, name, type, status, config',
    filter: { type: 'marketing' }
  });
  
  if (marketingAgents.data) {
    console.log(`✅ Found ${marketingAgents.data.length} marketing agents`);
    marketingAgents.data.forEach(agent => {
      console.log(`  Agent: ${agent.name} (${agent.status})`);
      console.log(`  Config: ${JSON.stringify(agent.config, null, 2)}`);
    });
  } else {
    console.log('Error getting marketing agents:', marketingAgents.error);
  }
  
  // 7. Business settings that might affect marketing
  console.log('\n7. BUSINESS SETTINGS:');
  const businessSettings = await supabaseQuery.queryTable('business_settings', { 
    select: '*',
    limit: 5
  });
  
  if (businessSettings.data) {
    console.log(`✅ Found ${businessSettings.data.length} business settings`);
    businessSettings.data.forEach(setting => {
      console.log(`  ${setting.key || setting.setting_key || 'Setting'}: ${JSON.stringify(setting, null, 2)}`);
    });
  } else {
    console.log('Error getting business settings:', businessSettings.error);
  }
}

analyzeExistingSchema().catch(console.error);