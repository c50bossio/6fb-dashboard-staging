const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTables() {
  console.log('🔍 Checking existing tables in Supabase...\n');
  
  // List of potential tables to check
  const tablesToCheck = [
    'profiles',
    'appointments', 
    'transactions',
    'services',
    'barbers',
    'barbershops',
    'barbershop_staff',
    'customers',
    'bookings',
    'payments',
    'users',
    'campaigns',
    'campaign_recipients',
    'campaign_analytics',
    'notifications',
    'agents',
    'tenants',
    'subscriptions',
    'reviews',
    'availability',
    'barber_availability',
    'service_categories',
    'products',
    'inventory'
  ];
  
  console.log('Checking for existing tables:');
  console.log('================================');
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        existingTables.push({ name: table, count: count || 0 });
        console.log('✅', table.padEnd(25), '- EXISTS (', count || 0, 'records)');
      } else if (error.message && error.message.includes('does not exist')) {
        missingTables.push(table);
        console.log('❌', table.padEnd(25), '- Does not exist');
      } else {
        console.log('⚠️', table.padEnd(25), '- Access error');
      }
    } catch (e) {
      console.log('⚠️', table.padEnd(25), '- Error:', e.message);
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('================================');
  console.log('Total tables found:', existingTables.length);
  console.log('Tables with data:', existingTables.filter(t => t.count > 0).length);
  console.log('Empty tables:', existingTables.filter(t => t.count === 0).length);
  console.log('Missing tables:', missingTables.length);
  
  // Show tables with data
  console.log('\n📈 Tables with data:');
  console.log('================================');
  const tablesWithData = existingTables.filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  for (const table of tablesWithData) {
    console.log(`${table.name}:`.padEnd(25), table.count, 'records');
  }
  
  // Show what we need for predictive analytics
  console.log('\n🎯 For Predictive Analytics, we need:');
  console.log('================================');
  const requiredTables = ['appointments', 'transactions'];
  for (const table of requiredTables) {
    const exists = existingTables.find(t => t.name === table);
    if (exists) {
      console.log(`✅ ${table}:`.padEnd(25), exists.count, 'records');
    } else {
      console.log(`❌ ${table}:`.padEnd(25), 'MISSING - needs to be created');
    }
  }
  
  // Check if we have bookings table as alternative to appointments
  const hasBookings = existingTables.find(t => t.name === 'bookings');
  if (hasBookings && hasBookings.count > 0) {
    console.log('\n💡 Alternative found:');
    console.log(`   'bookings' table has ${hasBookings.count} records`);
    console.log('   Could be used instead of appointments table');
  }
}

checkExistingTables();