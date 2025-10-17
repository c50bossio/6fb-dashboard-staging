#!/usr/bin/env node

// Test script for getTenant() function
import { getTenant } from './lib/tenant-resolver.js';

// Mock Supabase client for testing
const mockSupabase = {
  from: (table) => ({
    select: (fields) => ({
      eq: (field, value) => ({
        single: async () => {
          console.log(`📊 Querying ${table} for ${field}=${value}`);
          
          // Mock responses for different scenarios
          if (table === 'profiles') {
            if (value === 'user-with-barbershop') {
              return {
                data: { id: value, barbershop_id: 'shop-123', full_name: 'John Barber' },
                error: null
              };
            } else if (value === 'user-without-barbershop') {
              return {
                data: { id: value, barbershop_id: null, full_name: 'Jane Staff' },
                error: null
              };
            }
          } else if (table === 'barbershop_staff') {
            if (value === 'user-without-barbershop') {
              return {
                data: { barbershop_id: 'shop-456', user_id: value, is_active: true },
                error: null
              };
            }
          }
          
          return { data: null, error: null };
        }
      }),
      or: (conditions) => ({
        single: async () => {
          // Mock barbershop_staff query
          return {
            data: { barbershop_id: 'shop-789', user_id: 'test-user', is_active: true },
            error: null
          };
        }
      })
    })
  })
};

async function runTests() {
  console.log('🧪 Testing getTenant() Function\n');
  console.log('=' . repeat(50));
  
  // Test 1: User with direct barbershop_id
  console.log('\n📋 Test 1: User with direct barbershop_id');
  try {
    const result1 = await getTenant('user-with-barbershop', { supabase: mockSupabase });
    console.log('✅ Result:', result1);
    console.assert(result1.barbershopId === 'shop-123', 'Should return shop-123');
    console.assert(result1.source === 'profile', 'Should be from profile');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Staff member without direct barbershop_id
  console.log('\n📋 Test 2: Staff member (no direct barbershop_id)');
  try {
    const result2 = await getTenant('user-without-barbershop', { 
      supabase: mockSupabase,
      forceRefresh: true // Bypass cache
    });
    console.log('✅ Result:', result2);
    console.assert(result2.barbershopId === 'shop-456', 'Should return shop-456');
    console.assert(result2.source === 'staff', 'Should be from staff table');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Cache functionality
  console.log('\n📋 Test 3: Cache functionality');
  const start = Date.now();
  await getTenant('user-with-barbershop', { supabase: mockSupabase });
  const cached = await getTenant('user-with-barbershop', { supabase: mockSupabase });
  const duration = Date.now() - start;
  console.log(`✅ Second call took ${duration}ms (should be <5ms if cached)`);
  console.assert(duration < 10, 'Should use cache for second call');
  
  // Test 4: Force refresh bypasses cache
  console.log('\n📋 Test 4: Force refresh');
  const refreshed = await getTenant('user-with-barbershop', { 
    supabase: mockSupabase,
    forceRefresh: true 
  });
  console.log('✅ Force refresh completed:', refreshed);
  
  console.log('\n' + '=' . repeat(50));
  console.log('✨ All tests completed!\n');
}

// Run tests
runTests().catch(console.error);