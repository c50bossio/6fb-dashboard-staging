#!/usr/bin/env node

/**
 * Supabase Cookie Handlers Test
 * 
 * This test specifically checks if our custom cookie handlers in server-client.js
 * are actually invoked when creating a Supabase client.
 */

const path = require('path')
process.env.NODE_ENV = 'development'

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function testSupabaseCookieHandlers() {
  console.log('🧪 SUPABASE COOKIE HANDLERS TEST')
  console.log('=' .repeat(60))
  
  console.log('\n📋 Test Objective:')
  console.log('   Determine if Supabase uses our custom cookie handlers')
  console.log('   or reads cookies directly from HTTP headers')
  
  try {
    // Simulate a Next.js server environment
    console.log('\n📍 Step 1: Setting up Next.js server environment simulation')
    
    // Mock Next.js cookies() function
    const mockCookies = {
      getAll: () => {
        console.log('🍪 MOCK COOKIES getAll() called')
        return [
          { 
            name: 'sb-test-auth-token-code-verifier', 
            value: '"this-is-a-json-stringified-verifier-with-quotes"'  // Problematic format
          },
          { 
            name: 'other-cookie', 
            value: 'normal-value' 
          }
        ]
      },
      set: (name, value, options) => {
        console.log('🍪 MOCK COOKIES set() called:', { name, value: value.substring(0, 30) + '...' })
      }
    }
    
    // Mock the Next.js cookies import
    const Module = require('module')
    const originalRequire = Module.prototype.require
    
    Module.prototype.require = function(id) {
      if (id === 'next/headers') {
        console.log('📦 MOCKING next/headers - cookies() will return our mock')
        return {
          cookies: () => Promise.resolve(mockCookies)
        }
      }
      return originalRequire.apply(this, arguments)
    }
    
    console.log('📍 Step 2: Importing and testing server-client.js')
    
    // Import our server client
    const { createClient } = require('./lib/supabase/server-client')
    
    console.log('📍 Step 3: Creating Supabase client (should trigger getAll if used)')
    console.log('   🔍 Watch for: 🚨 [SERVER-CLIENT] GETALL CALLED')
    
    const supabase = await createClient()
    
    console.log('✅ Supabase client created')
    
    console.log('\n📍 Step 4: Testing auth operations that might read cookies')
    console.log('   🔍 Watch for additional getAll() calls')
    
    // Test getSession (might read cookies)
    try {
      const { data: session } = await supabase.auth.getSession()
      console.log('✅ getSession completed (session exists:', !!session?.session, ')')
    } catch (error) {
      console.log('⚠️  getSession error (expected in test):', error.message.substring(0, 50))
    }
    
    console.log('\n📊 ANALYSIS:')
    console.log('   If you see "🚨 [SERVER-CLIENT] GETALL CALLED" messages above:')
    console.log('     ✅ SUCCESS: Supabase IS using our custom cookie handlers')
    console.log('     ✅ Our PKCE fixes should work')
    console.log('   If you DON\'T see those messages:')
    console.log('     ❌ BYPASS: Supabase reads HTTP headers directly')
    console.log('     ❌ We need a different approach (HTTP header manipulation)')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack:', error.stack)
  } finally {
    // Restore original require
    const Module = require('module')
    Module.prototype.require = require('module').prototype.require
  }
}

testSupabaseCookieHandlers().catch(console.error)