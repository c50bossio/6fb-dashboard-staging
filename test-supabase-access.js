const { createClient } = require('@supabase/supabase-js');

// Environment setup
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 TESTING SUPABASE DATABASE CONNECTION');
console.log('=====================================\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log(`✅ Supabase URL: ${supabaseUrl}`);
console.log(`✅ Service Key: ${supabaseServiceKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
  try {
    console.log('\n🧪 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Test key tables
    const tables = ['profiles', 'barbershops', 'services', 'appointments'];
    
    for (const table of tables) {
      try {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (tableError) {
          console.log(`❌ Table '${table}': ${tableError.message}`);
        } else {
          console.log(`✅ Table '${table}': ${count || 0} records`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function main() {
  const isConnected = await testDatabaseConnection();
  
  console.log('\n📊 SUMMARY:');
  console.log('===========');
  
  if (isConnected) {
    console.log('✅ Database: Connected and operational');
    console.log('✅ Environment: Properly configured');
    console.log('\n🚀 System ready for development');
    process.exit(0);
  } else {
    console.log('❌ Database: Connection failed');
    console.log('❌ Environment: Requires configuration');
    console.log('\n🔧 Check environment variables and database setup');
    process.exit(1);
  }
}

main().catch(console.error);