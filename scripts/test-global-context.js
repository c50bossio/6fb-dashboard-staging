#!/usr/bin/env node

/**
 * Manual test script for Global Dashboard Context
 * Run with: node scripts/test-global-context.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRolePermissions() {

  const roles = [
    { role: 'ENTERPRISE_OWNER', expectedPermissions: ['canSeeAllLocations', 'canAddLocations', 'canCrossLocationManage'] },
    { role: 'SHOP_OWNER', expectedPermissions: ['canSeeOwnLocation', 'canAddBarbers'] },
    { role: 'BARBER', expectedPermissions: ['canSeeOwnSchedule', 'canViewOwnMetrics'] },
    { role: 'CLIENT', expectedPermissions: ['canBookAppointments', 'canViewAvailability'] }
  ];
  
  for (const { role, expectedPermissions } of roles) {
    
    expectedPermissions.forEach(perm => {
      
    });
  }
}

async function testLocationData() {

  try {
    const { data: barbershops, error } = await supabase
      .from('barbershops')
      .select('id, name, city, state')
      .limit(5);
    
    if (error) throw error;

    barbershops.forEach(shop => {
      `);
    });
  } catch (error) {
    console.error('  ❌ Error fetching locations:', error.message);
  }
}

async function testBarberData() {

  try {
    const { data: barbers, error } = await supabase
      .from('barbershop_staff')
      .select('user_id, barbershop_id, role')
      .limit(5);
    
    if (error) throw error;

  } catch (error) {
    console.error('  ❌ Error fetching barbers:', error.message);
  }
}

async function testMultiLocationAggregation() {

  try {
    // Get all barbershops
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(3);
    
    if (barbershops && barbershops.length > 1) {
      const shopIds = barbershops.map(s => s.id);
      
      // Test aggregated appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, barbershop_id, status')
        .in('barbershop_id', shopIds);
      
      if (!error) {
        
      }
      
      // Test aggregated customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, shop_id')
        .in('shop_id', shopIds);

    } else {
      
    }
  } catch (error) {
    console.error('  ❌ Error testing aggregation:', error.message);
  }
}

async function testContextPersistence() {

  // This would normally test localStorage in browser

   persists');
}

async function runTests() {

  await testRolePermissions();
  await testLocationData();
  await testBarberData();
  await testMultiLocationAggregation();
  await testContextPersistence();

}

runTests().catch(console.error);