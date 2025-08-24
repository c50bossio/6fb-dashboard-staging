#!/usr/bin/env node

/**
 * OAuth Flow Debugging Test
 * 
 * This script helps us understand exactly when our custom cookie handlers
 * are invoked during the OAuth process.
 */

const { createClient } = require('@supabase/supabase-js')

async function testOAuthDebugging() {
  console.log('🔍 OAUTH DEBUGGING TEST')
  console.log('=' .repeat(50))
  
  // Test 1: Check if we can access login page
  console.log('\n📍 Step 1: Testing login page access')
  try {
    const response = await fetch('http://localhost:9999/login')
    console.log('✅ Login page status:', response.status)
    console.log('✅ Login page accessible:', response.ok ? 'YES' : 'NO')
  } catch (error) {
    console.error('❌ Login page error:', error.message)
  }

  // Test 2: Check OAuth callback endpoint
  console.log('\n📍 Step 2: Testing OAuth callback endpoint structure')
  try {
    // This should return error since no code provided, but should be reachable
    const response = await fetch('http://localhost:9999/auth/callback')
    console.log('✅ OAuth callback status:', response.status)
    console.log('✅ OAuth callback reachable:', response.status === 302 || response.status === 200 ? 'YES' : 'NO')
  } catch (error) {
    console.error('❌ OAuth callback error:', error.message)
  }

  // Test 3: Check Supabase configuration
  console.log('\n📍 Step 3: Testing Supabase configuration')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('✅ Supabase URL configured:', !!supabaseUrl ? 'YES' : 'NO')
  console.log('✅ Supabase key configured:', !!supabaseKey ? 'YES' : 'NO')
  
  if (supabaseUrl && supabaseKey) {
    console.log('✅ URL preview:', supabaseUrl.substring(0, 30) + '...')
    console.log('✅ Key preview:', supabaseKey.substring(0, 30) + '...')
  }

  console.log('\n🎯 TESTING INSTRUCTIONS:')
  console.log('1. Open browser to: http://localhost:9999/login')
  console.log('2. Click "Continue with Google"')
  console.log('3. Complete OAuth flow')
  console.log('4. Watch server logs for these debug messages:')
  console.log('   - 🚨 [SERVER-CLIENT] GETALL CALLED (means our handlers are used)')
  console.log('   - 🚨 FIXING PKCE COOKIE (means cookie was quoted)')
  console.log('   - 🚨 exchangeCodeForSession COMPLETED (OAuth exchange result)')
  console.log('5. If no [SERVER-CLIENT] messages appear, Supabase bypasses our handlers')
  
  console.log('\n📊 POSSIBLE OUTCOMES:')
  console.log('✅ SUCCESS: getAll() called + PKCE fixed + OAuth succeeds')
  console.log('⚠️  PARTIAL: getAll() called but OAuth still fails (deeper PKCE issue)')
  console.log('❌ BYPASS: No getAll() calls (Supabase reads HTTP headers directly)')
}

// Load environment variables
require('dotenv').config({ path: '.env.local' })

testOAuthDebugging().catch(console.error)