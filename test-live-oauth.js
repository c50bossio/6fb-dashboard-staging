#!/usr/bin/env node

/**
 * Live OAuth Test with PKCE
 * 
 * Tests the OAuth flow on the live site to verify PKCE is working
 */

import puppeteer from 'puppeteer'

const SITE_URL = 'https://bookedbarber.com'

console.log('🧪 Testing Live OAuth with PKCE')
console.log('=' .repeat(50))

async function testLiveOAuth() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-web-security'],
    slowMo: 100 // Slow down actions for visibility
  })
  
  try {
    const page = await browser.newPage()
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   🔴 Console Error: ${msg.text()}`)
      } else if (msg.text().includes('oauth') || msg.text().includes('PKCE') || msg.text().includes('auth')) {
        console.log(`   📝 Console: ${msg.text()}`)
      }
    })
    
    // Monitor network requests
    page.on('response', response => {
      const url = response.url()
      if (url.includes('oauth') || url.includes('auth') || url.includes('google')) {
        console.log(`   🌐 ${response.status()} ${url}`)
      }
    })
    
    console.log('\n1. Navigating to login page...')
    await page.goto(`${SITE_URL}/simple-login`, { waitUntil: 'networkidle0' })
    
    console.log('   ✅ Page loaded successfully')
    
    console.log('\n2. Looking for Google sign-in button...')
    await page.waitForSelector('button', { timeout: 10000 })
    
    const buttonText = await page.$eval('button', el => el.textContent)
    console.log(`   ✅ Found button: "${buttonText}"`)
    
    console.log('\n3. Checking for OAuth URL generation...')
    
    // Extract the OAuth URL that would be generated
    const oauthData = await page.evaluate(async () => {
      // Simulate what happens when the button is clicked (without actually redirecting)
      try {
        const { createClient } = await import('/lib/supabase/browser-client.js')
        const supabase = createClient()
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: true
          }
        })
        
        if (error) throw error
        
        const url = new URL(data.url)
        return {
          success: true,
          url: data.url,
          codeChallenge: url.searchParams.get('code_challenge'),
          codeChallengeMethod: url.searchParams.get('code_challenge_method'),
          domain: url.hostname
        }
      } catch (err) {
        return { success: false, error: err.message }
      }
    })
    
    if (oauthData.success) {
      console.log('   ✅ OAuth URL generated successfully')
      console.log(`   - Domain: ${oauthData.domain}`)
      console.log(`   - Code Challenge: ${oauthData.codeChallenge ? 'Present (' + oauthData.codeChallenge.length + ' chars)' : 'Missing'}`)
      console.log(`   - Challenge Method: ${oauthData.codeChallengeMethod || 'Missing'}`)
      
      if (oauthData.codeChallenge && oauthData.codeChallengeMethod) {
        console.log('\n🎉 SUCCESS: PKCE is working on the live site!')
        console.log('   The "both auth code and code verifier should be non-empty" error should be resolved')
        
        console.log('\n4. Testing actual OAuth initiation...')
        console.log('   (This will redirect to Google - manual verification needed)')
        
        // Actually click the button to test the full flow
        await page.click('button')
        
        // Wait for redirect
        await page.waitForNavigation({ timeout: 10000 })
        
        const currentUrl = page.url()
        console.log(`   Current URL: ${currentUrl}`)
        
        if (currentUrl.includes('accounts.google.com')) {
          console.log('   ✅ Successfully redirected to Google OAuth')
          console.log('   🎯 FINAL RESULT: OAuth flow is working correctly!')
        } else if (currentUrl.includes('auth-code-error')) {
          console.log('   ❌ Still redirecting to error page - check Supabase configuration')
        } else {
          console.log(`   ❓ Unexpected redirect: ${currentUrl}`)
        }
        
      } else {
        console.log('\n❌ FAILURE: PKCE is still not working')
        console.log('   The configuration changes may not have taken effect')
      }
    } else {
      console.log(`   ❌ OAuth URL generation failed: ${oauthData.error}`)
    }
    
  } catch (err) {
    console.log(`   ❌ Test failed: ${err.message}`)
  } finally {
    console.log('\n   (Keeping browser open for manual verification - close manually)')
    // Don't close browser automatically for manual verification
    // await browser.close()
  }
}

// Run the test
testLiveOAuth().catch(console.error)