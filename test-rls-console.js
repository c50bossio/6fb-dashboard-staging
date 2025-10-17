// Console test for RLS manager debugging
// Run this in Node.js to test the RLS manager directly

import { createShopScopedQuery } from './lib/rls-context-manager.js'

async function testRLSConsole() {
  console.log('🧪 Starting console test for RLS manager...')
  
  try {
    // Test with mock context
    const mockContext = {
      userId: 'test-user',
      shopId: 'test-shop', 
      role: 'shop_owner',
      permissions: []
    }
    
    console.log('📊 Mock context:', mockContext)
    
    // Try to create a shop-scoped query
    console.log('🔍 Attempting to create shop-scoped query...')
    
    const query = createShopScopedQuery('appointments', mockContext)
    
    console.log('📊 Query result:', {
      queryExists: !!query,
      queryType: typeof query,
      hasEqMethod: typeof query?.eq === 'function',
      hasSelectMethod: typeof query?.select === 'function'
    })
    
    if (query && typeof query.eq === 'function') {
      console.log('✅ SUCCESS: RLS Context Manager is working!')
    } else {
      console.log('❌ FAILED: RLS Context Manager is not working properly')
    }
    
  } catch (error) {
    console.error('❌ Console Test Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testRLSConsole()
}