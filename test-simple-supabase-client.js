#!/usr/bin/env node

/**
 * Simple Supabase Client Test
 * 
 * Test if our custom getAll() method is called when creating
 * a Supabase client with fixed cookies.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Mock the Next.js environment
const originalRequire = require('module').prototype.require
require('module').prototype.require = function(id) {
  if (id === 'next/headers') {
    console.log('📦 MOCKING next/headers for test')
    return {
      cookies: () => Promise.resolve({
        getAll: () => {
          console.log('🍪 MOCK cookies.getAll() called (should not see this if using fixed cookies)')
          return []
        },
        set: () => {}
      })
    }
  }
  return originalRequire.apply(this, arguments)
}

async function testSupabaseClient() {
  console.log('🧪 SIMPLE SUPABASE CLIENT TEST')
  console.log('='.repeat(60))
  
  try {
    console.log('📍 Step 1: Testing createClient() with NO fixed cookies')
    const { createClient } = require('./lib/supabase/server-client')
    
    console.log('🔍 Creating client without fixed cookies (should use cookie store):')
    const client1 = await createClient()
    console.log('✅ Client created without fixed cookies')
    
    console.log('\n📍 Step 2: Testing createClient() WITH fixed cookies')
    const fixedCookies = [
      {
        name: 'sb-test-auth-token-code-verifier',
        value: 'test-verifier-without-quotes'
      },
      {
        name: 'other-cookie',
        value: 'test-value'
      }
    ]
    
    console.log('🔍 Creating client with fixed cookies (should bypass cookie store):')
    console.log('   Fixed cookies:', fixedCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    
    const client2 = await createClient(fixedCookies)
    console.log('✅ Client created with fixed cookies')
    
    console.log('\n📍 Step 3: Testing getSession() to trigger cookie reads')
    
    console.log('🔍 Calling getSession() - should trigger getAll() method:')
    try {
      await client2.auth.getSession()
      console.log('✅ getSession() completed')
    } catch (error) {
      console.log('⚠️  getSession() error (expected):', error.message.substring(0, 50))
    }
    
    console.log('\n📊 ANALYSIS:')
    console.log('If you see "🚨 [SERVER-CLIENT] USING FIXED COOKIES":')
    console.log('  ✅ SUCCESS: Our custom handlers are working')
    console.log('If you see "🚨 [SERVER-CLIENT] GETALL CALLED":')
    console.log('  ✅ PARTIAL: Original cookie store used (no fixed cookies)')
    console.log('If you see neither:')
    console.log('  ❌ BYPASS: Supabase completely bypasses our handlers')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSupabaseClient().catch(console.error)