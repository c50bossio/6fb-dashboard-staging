#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking database contents...\n');
  
  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('*')
    .limit(5);
  
  console.log(`📊 Barbers table:`);
  if (barbersError) {
    console.log(`   Error: ${barbersError.message}`);
  } else if (barbers?.length) {
    console.log(`   Found ${barbers.length} barbers:`);
    barbers.forEach(b => console.log(`   - ${b.id}: ${b.name}`));
  } else {
    console.log('   No barbers found');
  }
  
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .limit(5);
  
  console.log(`\n📊 Services table:`);
  if (servicesError) {
    console.log(`   Error: ${servicesError.message}`);
  } else if (services?.length) {
    console.log(`   Found ${services.length} services:`);
    services.forEach(s => console.log(`   - ${s.id}: ${s.name} (${s.duration_minutes} min)`));
  } else {
    console.log('   No services found');
  }
  
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .limit(5);
  
  console.log(`\n📊 Customers table:`);
  if (customersError) {
    console.log(`   Error: ${customersError.message}`);
  } else if (customers?.length) {
    console.log(`   Found ${customers.length} customers:`);
    customers.forEach(c => console.log(`   - ${c.id}: ${c.name} (${c.email})`));
  } else {
    console.log('   No customers found');
  }
  
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(5);
  
  console.log(`\n📊 Bookings table:`);
  if (bookingsError) {
    console.log(`   Error: ${bookingsError.message}`);
  } else if (bookings?.length) {
    console.log(`   Found ${bookings.length} bookings`);
    const recurring = bookings.filter(b => b.is_recurring);
    console.log(`   - Regular: ${bookings.length - recurring.length}`);
    console.log(`   - Recurring: ${recurring.length}`);
  } else {
    console.log('   No bookings found');
  }
  
  console.log('\n📊 Available tables in database:');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables', {});
  
  if (tablesError) {
    console.log('   Using alternate method to check tables...');
    
    const expectedTables = ['barbers', 'services', 'customers', 'bookings', 'profiles', 'appointments'];
    for (const table of expectedTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: Not accessible (${error.message})`);
      } else {
        console.log(`   ✅ ${table}: Accessible (${count} rows)`);
      }
    }
  } else if (tables?.length) {
    tables.forEach(t => console.log(`   - ${t.table_name}`));
  }
}

checkDatabase().catch(console.error);