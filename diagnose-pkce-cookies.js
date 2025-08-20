#!/usr/bin/env node

/**
 * PKCE Cookie Diagnostic Tool
 * 
 * This script helps diagnose the OAuth PKCE flow by checking:
 * 1. Cookie domains and scope
 * 2. Supabase configuration
 * 3. Redirect URL patterns
 * 4. Site URL configuration
 */

import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SITE_URL = 'https://bookedbarber.com'

console.log('🔍 PKCE Cookie Diagnostic Tool')
console.log('=' .repeat(50))

async function diagnosePKCEFlow() {
  console.log('\n1. Configuration Check:')
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log(`   Site URL: ${SITE_URL}`)
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  console.log('\n2. Testing OAuth URL Generation:')
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
        skipBrowserRedirect: true // Don't actually redirect
      }
    })
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`)
      return
    }
    
    console.log(`   ✅ OAuth URL generated: ${data.url}`)
    
    // Parse the OAuth URL to check parameters
    const oauthUrl = new URL(data.url)
    console.log(`   - OAuth Domain: ${oauthUrl.hostname}`)
    console.log(`   - Redirect URI: ${oauthUrl.searchParams.get('redirect_uri')}`)
    console.log(`   - Code Challenge: ${oauthUrl.searchParams.get('code_challenge') ? 'Present' : 'Missing'}`)
    console.log(`   - Code Challenge Method: ${oauthUrl.searchParams.get('code_challenge_method')}`)
    
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`)
  }
  
  console.log('\n3. Cookie Domain Analysis:')
  
  // Launch browser to test cookie behavior
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-web-security']
  })
  
  try {
    const page = await browser.newPage()
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('oauth') || request.url().includes('auth')) {
        console.log(`   📤 Request: ${request.method()} ${request.url()}`)
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('oauth') || response.url().includes('auth')) {
        console.log(`   📥 Response: ${response.status()} ${response.url()}`)
      }
    })
    
    // Navigate to login page
    console.log('\n   Loading login page...')
    await page.goto(`${SITE_URL}/simple-login`)
    
    // Wait for page to load
    await page.waitForSelector('button', { timeout: 10000 })
    
    // Check initial cookies
    const initialCookies = await page.cookies()
    console.log(`   Initial cookies count: ${initialCookies.length}`)
    initialCookies.forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
        console.log(`     - ${cookie.name}: ${cookie.domain} (${cookie.secure ? 'secure' : 'not secure'})`)
      }
    })
    
    // Click the Google sign-in button
    console.log('\n   Clicking Google sign-in button...')
    await page.evaluate(() => {
      // Find and click the Google sign-in button
      const button = document.querySelector('button')
      if (button) {
        button.click()
      }
    })
    
    // Wait a moment for OAuth initiation
    await page.waitForTimeout(2000)
    
    // Check cookies after OAuth initiation
    const afterOAuthCookies = await page.cookies()
    console.log(`\n   Cookies after OAuth initiation: ${afterOAuthCookies.length}`)
    afterOAuthCookies.forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('auth') || cookie.name.includes('pkce')) {
        console.log(`     - ${cookie.name}: ${cookie.domain} (value: ${cookie.value.substring(0, 20)}...)`)
      }
    })
    
    // Check if we were redirected to Google
    const currentUrl = page.url()
    console.log(`\n   Current URL: ${currentUrl}`)
    
    if (currentUrl.includes('accounts.google.com')) {
      console.log('   ✅ Successfully redirected to Google OAuth')
      
      // Check for PKCE-related cookies across all domains
      const allCookies = await page.cookies()
      const pkceCookies = allCookies.filter(c => 
        c.name.includes('pkce') || 
        c.name.includes('code_verifier') ||
        c.name.includes('supabase-auth-token')
      )
      
      console.log('\n   PKCE-related cookies found:')
      if (pkceCookies.length === 0) {
        console.log('   ❌ No PKCE cookies found - this is the problem!')
      } else {
        pkceCookies.forEach(cookie => {
          console.log(`     - ${cookie.name}: domain=${cookie.domain}, secure=${cookie.secure}`)
        })
      }
    } else {
      console.log('   ❌ Failed to redirect to Google')
    }
    
  } catch (err) {
    console.log(`   ❌ Browser test failed: ${err.message}`)
  } finally {
    await browser.close()
  }
  
  console.log('\n4. Configuration Recommendations:')
  console.log('   - Ensure Site URL in Supabase dashboard is set to: https://bookedbarber.com')
  console.log('   - Ensure redirect URLs include: https://bookedbarber.com/auth/callback')
  console.log('   - Check Google OAuth settings point to Supabase OAuth URL, not custom domain')
  console.log('   - Verify no middleware is interfering with /auth/ routes')
  
  console.log('\n5. Next Steps:')
  console.log('   If PKCE cookies are missing, the issue is likely:')
  console.log('   a) Site URL misconfiguration in Supabase')
  console.log('   b) Cookie domain restrictions')
  console.log('   c) Middleware interference')
  console.log('   d) Browser security restrictions')
}

// Run the diagnostic
diagnosePKCEFlow().catch(console.error)