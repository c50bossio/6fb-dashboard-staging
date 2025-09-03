#!/usr/bin/env node

/**
 * Test script to verify database query fixes
 * Tests the fixed queries for business_hours, services, and appointments
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testQueries() {
  console.log('🧪 Testing Database Queries\n');
  
  // Test barbershop_id for test shop
  const TEST_BARBERSHOP_ID = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';
  
  try {
    // 1. Test business_hours query (fixed to query JSONB column from barbershops table)
    console.log('1️⃣ Testing business_hours query...');
    const { data: barbershopData, error: bhError } = await supabase
      .from('barbershops')
      .select('business_hours')
      .eq('id', TEST_BARBERSHOP_ID)
      .single();
    
    if (bhError) {
      console.error('❌ Business hours query failed:', bhError.message);
    } else {
      console.log('✅ Business hours query successful');
      console.log('   Data:', barbershopData?.business_hours ? 'Found JSONB data' : 'No data');
    }
    
    // 2. Test services query (fixed to use shop_id)
    console.log('\n2️⃣ Testing services query...');
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', TEST_BARBERSHOP_ID);
    
    if (servicesError) {
      console.error('❌ Services query failed:', servicesError.message);
    } else {
      console.log('✅ Services query successful');
      console.log('   Found', servicesData?.length || 0, 'services');
    }
    
    // 3. Test appointments query (fixed to use start_time)
    console.log('\n3️⃣ Testing appointments query...');
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', TEST_BARBERSHOP_ID)
      .gte('start_time', new Date().toISOString())
      .limit(10);
    
    if (appointmentsError) {
      console.error('❌ Appointments query failed:', appointmentsError.message);
    } else {
      console.log('✅ Appointments query successful');
      console.log('   Found', appointmentsData?.length || 0, 'upcoming appointments');
    }
    
    // 4. Test the actual service methods from supabase-service.js
    console.log('\n4️⃣ Testing supabase-service.js methods...');
    
    // Import and test the service
    const { default: SupabaseService } = await import('./lib/supabase-service.js');
    const service = SupabaseService;
    
    // Test getBusinessHours method
    console.log('   Testing getBusinessHours()...');
    try {
      const businessHours = await service.getBusinessHours(TEST_BARBERSHOP_ID);
      console.log('   ✅ getBusinessHours() works:', Array.isArray(businessHours) ? `${businessHours.length} days` : 'No data');
    } catch (err) {
      console.error('   ❌ getBusinessHours() failed:', err.message);
    }
    
    // Test getServices method
    console.log('   Testing getServices()...');
    try {
      const services = await service.getServices(TEST_BARBERSHOP_ID);
      console.log('   ✅ getServices() works:', `${services?.length || 0} services found`);
    } catch (err) {
      console.error('   ❌ getServices() failed:', err.message);
    }
    
    // Test getAppointments method
    console.log('   Testing getAppointments()...');
    try {
      const appointments = await service.getAppointments(TEST_BARBERSHOP_ID);
      console.log('   ✅ getAppointments() works:', `${appointments?.length || 0} appointments found`);
    } catch (err) {
      console.error('   ❌ getAppointments() failed:', err.message);
    }
    
    console.log('\n✅ All query tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testQueries().catch(console.error);