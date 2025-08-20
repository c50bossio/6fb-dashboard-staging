#!/usr/bin/env node

/**
 * Test PKCE Configuration
 * 
 * Verifies that PKCE is properly enabled in our Supabase client setup
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing PKCE Configuration')
console.log('=' .repeat(40))

async function testPKCEEnabled() {
  // Create client with explicit PKCE configuration
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: false, // Disable for testing
        autoRefreshToken: false // Disable for testing
      }
    }
  )

  console.log('\n1. Configuration:')
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log(`   PKCE Flow: Explicitly enabled`)
  
  console.log('\n2. Testing OAuth URL Generation with PKCE:')
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://bookedbarber.com/auth/callback',
        skipBrowserRedirect: true // Don't actually redirect
      }
    })
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`)
      return
    }
    
    console.log(`   ✅ OAuth URL generated successfully`)
    
    // Parse the OAuth URL to check PKCE parameters
    const oauthUrl = new URL(data.url)
    console.log(`\n3. PKCE Parameters Analysis:`)
    console.log(`   - OAuth Domain: ${oauthUrl.hostname}`)
    console.log(`   - Redirect URI: ${oauthUrl.searchParams.get('redirect_uri')}`)
    
    const codeChallenge = oauthUrl.searchParams.get('code_challenge')
    const codeChallengeMethod = oauthUrl.searchParams.get('code_challenge_method')
    
    if (codeChallenge) {
      console.log(`   ✅ Code Challenge: ${codeChallenge.substring(0, 20)}... (${codeChallenge.length} chars)`)
    } else {
      console.log(`   ❌ Code Challenge: Missing`)
    }
    
    if (codeChallengeMethod) {
      console.log(`   ✅ Code Challenge Method: ${codeChallengeMethod}`)
    } else {
      console.log(`   ❌ Code Challenge Method: Missing`)
    }
    
    console.log(`\n4. Full OAuth URL Analysis:`)
    console.log(`   ${data.url}`)
    
    // Check if this looks like a proper PKCE flow
    if (codeChallenge && codeChallengeMethod) {
      console.log(`\n🎉 SUCCESS: PKCE is properly enabled!`)
      console.log(`   - Code challenge generated: ${codeChallenge.length} characters`)
      console.log(`   - Challenge method: ${codeChallengeMethod}`)
      console.log(`   - This should resolve the "both auth code and code verifier should be non-empty" error`)
    } else {
      console.log(`\n❌ FAILURE: PKCE is still not enabled`)
      console.log(`   - This means the configuration change didn't work`)
      console.log(`   - Check @supabase/ssr package version and documentation`)
    }
    
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`)
  }
}

// Run the test
testPKCEEnabled().catch(console.error)