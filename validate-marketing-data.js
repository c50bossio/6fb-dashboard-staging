import 'dotenv/config';
import supabaseQuery from './lib/supabase-query.js';

async function validateMarketingData() {
  console.log('=== MARKETING DATA VALIDATION ===\n');
  
  // 1. List all available tables
  console.log('1. Available Database Tables:');
  const tables = await supabaseQuery.listTables();
  tables.forEach(table => {
    console.log(`  - ${table.table_name || table}`);
  });
  
  // 2. Get detailed customer data for marketing
  console.log('\n2. Customer Data for Marketing Campaigns:');
  const customers = await supabaseQuery.queryTable('profiles', { 
    select: 'id, email, full_name, phone, role, created_at, metadata',
    limit: 10 
  });
  
  if (customers.data) {
    console.log(`✅ Found ${customers.data.length} customer profiles`);
    customers.data.forEach((customer, index) => {
      console.log(`  Customer ${index + 1}:`);
      console.log(`    Email: ${customer.email}`);
      console.log(`    Name: ${customer.full_name || 'N/A'}`);
      console.log(`    Phone: ${customer.phone || 'N/A'}`);
      console.log(`    Role: ${customer.role}`);
      console.log(`    Joined: ${new Date(customer.created_at).toLocaleDateString()}`);
      console.log(`    ---`);
    });
  }
  
  // 3. Check for marketing-specific tables
  console.log('\n3. Marketing Table Analysis:');
  const marketingTables = ['campaigns', 'email_campaigns', 'sms_campaigns', 'marketing_campaigns', 'campaign_analytics'];
  
  for (const tableName of marketingTables) {
    const result = await supabaseQuery.queryTable(tableName, { limit: 1 });
    if (!result.error) {
      console.log(`✅ Table '${tableName}' exists`);
      
      // Get schema
      const schema = await supabaseQuery.getTableSchema(tableName);
      if (schema.data) {
        console.log(`   Columns: ${schema.data.map(col => col.column_name).join(', ')}`);
      }
    } else {
      console.log(`❌ Table '${tableName}' does not exist`);
    }
  }
  
  // 4. Check analytics events for marketing behavior
  console.log('\n4. Analytics Events (Marketing Behavior):');
  const analytics = await supabaseQuery.queryTable('analytics_events', { 
    select: 'event_type, properties, user_id, created_at',
    limit: 5,
    orderBy: 'created_at',
    ascending: false
  });
  
  if (analytics.data) {
    console.log(`✅ Found ${analytics.data.length} analytics events`);
    analytics.data.forEach((event, index) => {
      console.log(`  Event ${index + 1}: ${event.event_type} (User: ${event.user_id})`);
    });
  }
  
  // 5. Customer segmentation analysis
  console.log('\n5. Customer Segmentation Analysis:');
  const userRoles = await supabaseQuery.executeSQL(`
    SELECT role, COUNT(*) as count 
    FROM profiles 
    GROUP BY role 
    ORDER BY count DESC
  `);
  
  if (userRoles.data) {
    console.log('   Role Distribution:');
    userRoles.data.forEach(role => {
      console.log(`     ${role.role}: ${role.count} users`);
    });
  }
}

validateMarketingData().catch(console.error);