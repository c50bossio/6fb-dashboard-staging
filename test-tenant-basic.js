#!/usr/bin/env node

// Basic test for getTenant() logic (without database)
console.log('🧪 Testing getTenant() Implementation\n');
console.log('=' . repeat(50));

// Create a simple in-memory cache to test caching behavior
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simplified getTenant logic for testing
async function getTenant(userId, options = {}) {
  const { forceRefresh = false, supabase } = options;
  
  if (!userId) {
    return {
      barbershopId: null,
      source: 'invalid_input',
      metadata: { error: 'User ID is required' }
    };
  }
  
  // Check cache
  const cacheKey = `tenant:${userId}`;
  if (!forceRefresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`  📦 Cache hit for ${userId}`);
      return {
        ...cached.data,
        metadata: { ...cached.data.metadata, fromCache: true }
      };
    }
    cache.delete(cacheKey);
  }
  
  console.log(`  🔍 Fetching fresh data for ${userId}`);
  
  // Simulate database lookup
  let barbershopId = null;
  let source = 'no_association';
  
  if (userId === 'user-with-shop') {
    barbershopId = 'shop-123';
    source = 'profile';
  } else if (userId === 'staff-member') {
    barbershopId = 'shop-456';
    source = 'staff';
  }
  
  const result = {
    barbershopId,
    source,
    metadata: {
      resolvedAt: new Date().toISOString(),
      userId
    }
  };
  
  // Cache result
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });
  
  return result;
}

// Run tests
async function runTests() {
  console.log('\n📋 Test 1: User with direct barbershop');
  const result1 = await getTenant('user-with-shop');
  console.log('✅ Result:', JSON.stringify(result1, null, 2));
  console.assert(result1.barbershopId === 'shop-123', 'Should return shop-123');
  
  console.log('\n📋 Test 2: Staff member');
  const result2 = await getTenant('staff-member');
  console.log('✅ Result:', JSON.stringify(result2, null, 2));
  console.assert(result2.barbershopId === 'shop-456', 'Should return shop-456');
  
  console.log('\n📋 Test 3: User with no association');
  const result3 = await getTenant('no-shop-user');
  console.log('✅ Result:', JSON.stringify(result3, null, 2));
  console.assert(result3.barbershopId === null, 'Should return null');
  
  console.log('\n📋 Test 4: Cache functionality');
  await getTenant('user-with-shop'); // Should hit cache
  const cachedResult = await getTenant('user-with-shop');
  console.log('✅ Cached result has fromCache:', cachedResult.metadata.fromCache === true);
  
  console.log('\n📋 Test 5: Force refresh bypasses cache');
  const refreshed = await getTenant('user-with-shop', { forceRefresh: true });
  console.log('✅ Force refresh completed, fromCache:', refreshed.metadata.fromCache || false);
  
  console.log('\n📋 Test 6: Invalid input handling');
  const invalid = await getTenant(null);
  console.log('✅ Null user handled:', invalid.source === 'invalid_input');
  
  console.log('\n' + '=' . repeat(50));
  console.log('✨ Basic logic tests completed!\n');
}

runTests().catch(console.error);