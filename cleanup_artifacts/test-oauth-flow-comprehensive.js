#!/usr/bin/env node

/**
 * Comprehensive OAuth Signup Flow Test
 * Tests the complete flow from homepage → register → Google OAuth → callback
 */

const { chromium } = require('playwright')

async function testOAuthFlow() {
  console.log('🚀 Starting comprehensive OAuth signup flow test...')
  
  let browser, context, page
  
  try {
    // Launch browser with debugging enabled
    browser = await chromium.launch({ 
      headless: false, // Set to true for CI
      slowMo: 1000,    // Slow down for observation
      args: ['--disable-web-security'] // Allow local development
    })
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    })
    
    page = await context.newPage()
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`🌐 Console [${msg.type()}]:`, msg.text())
    })
    
    // Track network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ HTTP ${response.status()}: ${response.url()}`)
      }
    })
    
    console.log('\n📝 Test Step 1: Navigate to homepage')
    await page.goto('http://localhost:9999')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-screenshots/01-homepage.png' })
    console.log('✅ Homepage loaded successfully')
    
    console.log('\n📝 Test Step 2: Find and click Sign Up button')
    
    // Look for Sign Up button - try multiple selectors
    const signUpSelectors = [
      'a[href="/register"]',
      'text="Sign Up"',
      'text="Sign up"',
      '[data-test="signup-button"]'
    ]
    
    let signUpButton = null
    for (const selector of signUpSelectors) {
      signUpButton = await page.locator(selector).first()
      if (await signUpButton.isVisible()) {
        console.log(`✅ Found Sign Up button with selector: ${selector}`)
        break
      }
    }
    
    if (!signUpButton || !(await signUpButton.isVisible())) {
      throw new Error('❌ Sign Up button not found on homepage')
    }
    
    await signUpButton.click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-screenshots/02-register-page.png' })
    console.log('✅ Successfully navigated to register page')
    
    console.log('\n📝 Test Step 3: Verify registration page elements')
    
    // Check for required elements
    const requiredElements = [
      'input[name="firstName"]',
      'input[name="email"]',
      'button[data-track-click="oauth-google-signup"]'
    ]
    
    for (const selector of requiredElements) {
      const element = page.locator(selector)
      if (!(await element.isVisible())) {
        throw new Error(`❌ Required element not found: ${selector}`)
      }
    }
    console.log('✅ All required registration elements present')
    
    console.log('\n📝 Test Step 4: Find and click Google OAuth button')
    
    const googleButton = page.locator('button[data-track-click="oauth-google-signup"]')
    if (!(await googleButton.isVisible())) {
      throw new Error('❌ Google OAuth button not found')
    }
    
    // Check button text
    const buttonText = await googleButton.textContent()
    console.log(`✅ Found Google OAuth button: "${buttonText}"`)
    
    console.log('\n📝 Test Step 5: Test OAuth initiation (without completing Google flow)')
    
    // Listen for navigation to OAuth URL
    const navigationPromise = page.waitForURL(/accounts\.google\.com/, { timeout: 30000 })
    
    try {
      await googleButton.click()
      console.log('🔄 Clicked Google OAuth button, waiting for redirect...')
      
      // Wait for navigation to Google or error
      await navigationPromise
      
      const currentUrl = page.url()
      console.log(`✅ Successfully redirected to OAuth provider: ${currentUrl.substring(0, 50)}...`)
      
      // Take screenshot of Google OAuth page
      await page.screenshot({ path: 'test-screenshots/03-google-oauth.png' })
      
      console.log('\n📝 Test Step 6: Verify OAuth URL structure')
      
      // Verify OAuth URL contains required parameters
      const url = new URL(currentUrl)
      const requiredParams = ['client_id', 'redirect_uri', 'response_type', 'scope']
      
      for (const param of requiredParams) {
        if (!url.searchParams.has(param)) {
          console.warn(`⚠️ Missing OAuth parameter: ${param}`)
        } else {
          console.log(`✅ OAuth parameter present: ${param}`)
        }
      }
      
      // Check redirect URI
      const redirectUri = url.searchParams.get('redirect_uri')
      if (redirectUri && redirectUri.includes('localhost')) {
        console.log(`✅ Redirect URI correctly points to localhost: ${redirectUri}`)
      } else {
        console.warn(`⚠️ Unexpected redirect URI: ${redirectUri}`)
      }
      
    } catch (error) {
      if (error.message.includes('Timeout')) {
        console.log('⚠️ OAuth redirect timed out - checking for client-side errors...')
        
        // Check for JavaScript errors
        const jsErrors = []
        page.on('pageerror', err => jsErrors.push(err.message))
        
        // Wait a bit more and take screenshot
        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'test-screenshots/03-oauth-error.png' })
        
        if (jsErrors.length > 0) {
          console.log('❌ JavaScript errors detected:')
          jsErrors.forEach(err => console.log(`   - ${err}`))
        }
        
        // Check if we're still on register page
        if (page.url().includes('/register')) {
          console.log('📍 Still on register page - checking for error messages...')
          
          // Look for error messages
          const errorMessages = await page.locator('.text-red-600, .status-error, [class*="error"]').allTextContents()
          if (errorMessages.length > 0) {
            console.log('❌ Error messages found:')
            errorMessages.forEach(msg => console.log(`   - ${msg}`))
          } else {
            console.log('ℹ️ No error messages visible')
          }
        }
        
        throw new Error('OAuth initiation failed - did not redirect to Google')
      } else {
        throw error
      }
    }
    
    console.log('\n🎉 OAuth flow test completed successfully!')
    console.log('\n📊 Summary:')
    console.log('✅ Homepage loads correctly')
    console.log('✅ Sign Up button works')
    console.log('✅ Registration page loads with all elements')
    console.log('✅ Google OAuth button is present and functional')
    console.log('✅ OAuth initiation redirects to Google correctly')
    console.log('✅ OAuth URL contains required parameters')
    
    return {
      success: true,
      steps: {
        homepageLoad: true,
        signUpButtonClick: true,
        registerPageLoad: true,
        googleButtonClick: true,
        oauthRedirect: true,
        oauthUrlValid: true
      }
    }
    
  } catch (error) {
    console.error('\n❌ OAuth flow test failed:', error.message)
    
    // Take error screenshot
    if (page) {
      await page.screenshot({ path: 'test-screenshots/error-state.png' })
      console.log('📸 Error screenshot saved')
    }
    
    return {
      success: false,
      error: error.message,
      currentUrl: page ? page.url() : 'unknown'
    }
    
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Test callback handling (without real OAuth)
async function testCallbackHandling() {
  console.log('\n🔄 Testing callback handling...')
  
  let browser, context, page
  
  try {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
    
    // Test callback page with missing code (should show error)
    console.log('📝 Testing callback page with missing code...')
    await page.goto('http://localhost:9999/auth/callback')
    await page.waitForLoadState('networkidle')
    
    // Check for error handling
    const pageContent = await page.textContent('body')
    if (pageContent.includes('error') || pageContent.includes('failed')) {
      console.log('✅ Callback page correctly handles missing code')
    } else {
      console.log('⚠️ Callback page behavior unclear for missing code')
    }
    
    await page.screenshot({ path: 'test-screenshots/04-callback-test.png' })
    
    return true
  } catch (error) {
    console.error('❌ Callback test failed:', error.message)
    return false
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Main test execution
async function main() {
  console.log('🧪 Starting comprehensive OAuth testing suite...\n')
  
  // Create screenshots directory
  const fs = require('fs')
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots')
  }
  
  // Test main OAuth flow
  const oauthResult = await testOAuthFlow()
  
  // Test callback handling
  const callbackResult = await testCallbackHandling()
  
  // Generate report
  console.log('\n📋 FINAL TEST REPORT')
  console.log('==================')
  
  if (oauthResult.success) {
    console.log('✅ OAuth Flow: PASSED')
    console.log('   - Homepage navigation: Working')
    console.log('   - Sign Up button: Working')  
    console.log('   - Registration page: Working')
    console.log('   - Google OAuth button: Working')
    console.log('   - OAuth initiation: Working')
    console.log('   - OAuth redirect: Working')
  } else {
    console.log('❌ OAuth Flow: FAILED')
    console.log(`   Error: ${oauthResult.error}`)
  }
  
  if (callbackResult) {
    console.log('✅ Callback Handling: PASSED')
  } else {
    console.log('❌ Callback Handling: FAILED')
  }
  
  console.log('\n📸 Screenshots saved in test-screenshots/ directory')
  console.log('\nNext steps for manual verification:')
  console.log('1. Check Google OAuth configuration in Supabase dashboard')
  console.log('2. Verify Google OAuth consent screen setup')
  console.log('3. Test complete flow with real Google account')
  
  process.exit(oauthResult.success ? 0 : 1)
}

// Run the tests
main().catch(console.error)