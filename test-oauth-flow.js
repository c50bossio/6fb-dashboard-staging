#!/usr/bin/env node
/**
 * OAuth Flow Testing with Google Sign-in
 * Tests the complete flow from homepage to registration and OAuth callback
 */

import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = 'http://localhost:9999'

class OAuthFlowTester {
  constructor() {
    this.browser = null
    this.page = null
    this.screenshots = []
  }

  async initialize() {
    console.log('🚀 Initializing OAuth Flow Test...')
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for automated testing
      devtools: true,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox'
      ]
    })
    
    this.page = await this.browser.newPage()
    
    // Listen for console messages
    this.page.on('console', msg => {
      console.log(`🖥️  [${msg.type()}] ${msg.text()}`)
    })
    
    // Listen for network requests
    this.page.on('request', request => {
      if (request.url().includes('auth') || request.url().includes('oauth') || request.url().includes('callback')) {
        console.log(`🌐 [${request.method()}] ${request.url()}`)
      }
    })
    
    // Listen for network responses
    this.page.on('response', response => {
      if (response.url().includes('auth') || response.url().includes('oauth') || response.url().includes('callback')) {
        console.log(`📡 [${response.status()}] ${response.url()}`)
      }
    })
  }

  async takeScreenshot(name, description) {
    const filename = `screenshot-${Date.now()}-${name}.png`
    await this.page.screenshot({ path: filename, fullPage: true })
    this.screenshots.push({ filename, description, timestamp: new Date() })
    console.log(`📸 Screenshot saved: ${filename} - ${description}`)
    return filename
  }

  async step1_NavigateToHomepage() {
    console.log('\n=== STEP 1: Navigate to Homepage ===')
    
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle2' })
    await this.takeScreenshot('01-homepage', 'Homepage loaded')
    
    // Check if page loaded correctly
    const title = await this.page.title()
    console.log(`✅ Page title: ${title}`)
    
    // Check for sign-up buttons
    const signUpButtons = await this.page.$$eval('a[href="/register"], button:contains("Sign Up")', 
      buttons => buttons.map(btn => ({
        text: btn.textContent.trim(),
        href: btn.href || btn.getAttribute('href'),
        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
      }))
    )
    
    console.log(`✅ Found ${signUpButtons.length} sign-up buttons:`, signUpButtons)
    return signUpButtons.length > 0
  }

  async step2_ClickSignUp() {
    console.log('\n=== STEP 2: Click Sign Up Button ===')
    
    // Look for various sign-up buttons
    const signUpSelectors = [
      'a[href="/register"]',
      'button:contains("Start Building Your Brand")',
      'button:contains("Sign Up")',
      '.hero-section a[href="/register"]'
    ]
    
    let clicked = false
    for (const selector of signUpSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 2000 })
        await this.page.click(selector)
        console.log(`✅ Clicked sign-up button: ${selector}`)
        clicked = true
        break
      } catch (error) {
        console.log(`⏭️  Selector not found: ${selector}`)
      }
    }
    
    if (!clicked) {
      // Try clicking the first visible sign-up link
      const firstSignUp = await this.page.$('a[href="/register"]')
      if (firstSignUp) {
        await firstSignUp.click()
        console.log('✅ Clicked first available sign-up link')
        clicked = true
      }
    }
    
    if (clicked) {
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' })
      await this.takeScreenshot('02-register-page', 'Register page loaded')
      return true
    } else {
      console.log('❌ No sign-up button found to click')
      return false
    }
  }

  async step3_CheckRegisterPage() {
    console.log('\n=== STEP 3: Check Register Page ===')
    
    const currentUrl = this.page.url()
    console.log(`📍 Current URL: ${currentUrl}`)
    
    // Check if we're on the register page
    if (!currentUrl.includes('/register')) {
      console.log('❌ Not on register page')
      return false
    }
    
    // Look for Google sign-in button
    const googleButtons = await this.page.$$eval('button', buttons => 
      buttons.filter(btn => 
        btn.textContent.includes('Google') || 
        btn.textContent.includes('google') ||
        btn.getAttribute('data-track-click') === 'oauth-google-signup'
      ).map(btn => ({
        text: btn.textContent.trim(),
        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
        disabled: btn.disabled
      }))
    )
    
    console.log(`✅ Found ${googleButtons.length} Google sign-in buttons:`, googleButtons)
    
    // Check for form elements
    const formElements = await this.page.$$eval('input, button', elements =>
      elements.map(el => ({
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        placeholder: el.placeholder,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      })).filter(el => el.visible)
    )
    
    console.log(`✅ Found ${formElements.length} form elements`)
    return googleButtons.length > 0
  }

  async step4_ClickGoogleSignIn() {
    console.log('\n=== STEP 4: Click Google Sign In ===')
    
    // Wait for Google button to be available
    const googleButtonSelectors = [
      'button[data-track-click="oauth-google-signup"]',
      'button:contains("Sign up with Google")',
      'button:contains("Google")'
    ]
    
    let googleButton = null
    for (const selector of googleButtonSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 })
        googleButton = await this.page.$(selector)
        if (googleButton) {
          console.log(`✅ Found Google button: ${selector}`)
          break
        }
      } catch (error) {
        console.log(`⏭️  Google button selector not found: ${selector}`)
      }
    }
    
    if (!googleButton) {
      // Try a more generic approach
      googleButton = await this.page.$x("//button[contains(text(), 'Google')]")[0]
      if (!googleButton) {
        console.log('❌ No Google sign-in button found')
        await this.takeScreenshot('04-no-google-button', 'No Google button found')
        return false
      }
    }
    
    await this.takeScreenshot('04-before-google-click', 'Before clicking Google button')
    
    // Enable request interception to monitor OAuth flow
    await this.page.setRequestInterception(true)
    
    const oauthRequests = []
    this.page.on('request', (request) => {
      const url = request.url()
      if (url.includes('oauth') || url.includes('auth') || url.includes('google') || url.includes('supabase')) {
        oauthRequests.push({
          method: request.method(),
          url: url,
          headers: request.headers(),
          timestamp: new Date()
        })
        console.log(`🔐 OAuth Request: ${request.method()} ${url}`)
      }
      request.continue()
    })
    
    // Click the Google sign-in button
    console.log('🔐 Clicking Google sign-in button...')
    await googleButton.click()
    
    // Wait for OAuth flow to start
    await this.page.waitForTimeout(2000)
    await this.takeScreenshot('04-after-google-click', 'After clicking Google button')
    
    return { success: true, requests: oauthRequests }
  }

  async step5_MonitorOAuthFlow() {
    console.log('\n=== STEP 5: Monitor OAuth Flow ===')
    
    // Wait for potential redirects or errors
    let currentUrl = this.page.url()
    console.log(`📍 Starting URL: ${currentUrl}`)
    
    // Wait for OAuth flow to complete or error to appear
    const maxWait = 10000 // 10 seconds
    const checkInterval = 500 // 0.5 seconds
    let elapsed = 0
    let lastUrl = currentUrl
    
    while (elapsed < maxWait) {
      await this.page.waitForTimeout(checkInterval)
      elapsed += checkInterval
      
      currentUrl = this.page.url()
      
      // Check if URL changed (redirect happened)
      if (currentUrl !== lastUrl) {
        console.log(`🔄 URL changed: ${lastUrl} -> ${currentUrl}`)
        lastUrl = currentUrl
        
        // Check if we're in an OAuth flow
        if (currentUrl.includes('accounts.google.com') || 
            currentUrl.includes('oauth') || 
            currentUrl.includes('callback')) {
          console.log('🔐 OAuth flow detected in URL')
          await this.takeScreenshot('05-oauth-flow', 'OAuth flow in progress')
        }
        
        // Check if we reached a callback
        if (currentUrl.includes('/auth/callback')) {
          console.log('✅ OAuth callback reached')
          await this.takeScreenshot('05-oauth-callback', 'OAuth callback page')
          break
        }
        
        // Check if we reached dashboard or pricing
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/subscribe')) {
          console.log('✅ OAuth completed - redirected to protected page')
          await this.takeScreenshot('05-oauth-complete', 'OAuth completed successfully')
          break
        }
      }
      
      // Check for error messages on the page
      const errorMessages = await this.page.$$eval('[class*="error"], [class*="alert"]', 
        elements => elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
      )
      
      if (errorMessages.length > 0) {
        console.log('❌ Error messages found:', errorMessages)
        await this.takeScreenshot('05-oauth-error', 'OAuth error detected')
        break
      }
    }
    
    const finalUrl = this.page.url()
    console.log(`📍 Final URL: ${finalUrl}`)
    
    return {
      success: finalUrl.includes('/dashboard') || finalUrl.includes('/subscribe'),
      finalUrl,
      redirected: finalUrl !== currentUrl
    }
  }

  async step6_CheckFinalState() {
    console.log('\n=== STEP 6: Check Final State ===')
    
    const finalUrl = this.page.url()
    await this.takeScreenshot('06-final-state', 'Final state after OAuth flow')
    
    // Check authentication state
    let authState = 'unknown'
    try {
      // Try to access Supabase auth status via page evaluation
      const authResult = await this.page.evaluate(async () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keys = Object.keys(window.localStorage)
          const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'))
          return {
            hasAuthData: authKeys.length > 0,
            authKeys: authKeys,
            url: window.location.href
          }
        }
        return null
      })
      
      if (authResult) {
        console.log('🔐 Auth state:', authResult)
        authState = authResult.hasAuthData ? 'authenticated' : 'not_authenticated'
      }
    } catch (error) {
      console.log('⚠️  Could not check auth state:', error.message)
    }
    
    // Check page content for success indicators
    const pageContent = await this.page.content()
    const hasError = pageContent.includes('error') || pageContent.includes('failed')
    const hasSuccess = pageContent.includes('dashboard') || pageContent.includes('welcome') || pageContent.includes('subscribe')
    
    console.log(`✅ Final Results:`)
    console.log(`   - URL: ${finalUrl}`)
    console.log(`   - Auth State: ${authState}`)
    console.log(`   - Has Error: ${hasError}`)
    console.log(`   - Has Success Indicators: ${hasSuccess}`)
    
    return {
      url: finalUrl,
      authState,
      hasError,
      hasSuccess,
      success: hasSuccess && !hasError
    }
  }

  async generateReport() {
    console.log('\n=== OAUTH FLOW TEST REPORT ===')
    console.log(`Test completed at: ${new Date().toISOString()}`)
    console.log(`Total screenshots taken: ${this.screenshots.length}`)
    console.log('\nScreenshots:')
    this.screenshots.forEach(({ filename, description, timestamp }) => {
      console.log(`  📸 ${filename} - ${description} (${timestamp.toLocaleTimeString()})`)
    })
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async runFullTest() {
    try {
      await this.initialize()
      
      const step1 = await this.step1_NavigateToHomepage()
      if (!step1) {
        console.log('❌ FAILED: Could not load homepage or find sign-up buttons')
        return false
      }
      
      const step2 = await this.step2_ClickSignUp()
      if (!step2) {
        console.log('❌ FAILED: Could not click sign-up button')
        return false
      }
      
      const step3 = await this.step3_CheckRegisterPage()
      if (!step3) {
        console.log('❌ FAILED: Register page did not load correctly or missing Google button')
        return false
      }
      
      const step4 = await this.step4_ClickGoogleSignIn()
      if (!step4.success) {
        console.log('❌ FAILED: Could not click Google sign-in button')
        return false
      }
      
      const step5 = await this.step5_MonitorOAuthFlow()
      const step6 = await this.step6_CheckFinalState()
      
      await this.generateReport()
      
      console.log('\n=== FINAL VERDICT ===')
      if (step6.success) {
        console.log('✅ OAuth flow completed successfully!')
        console.log(`   User was redirected to: ${step6.url}`)
        console.log(`   Authentication state: ${step6.authState}`)
      } else {
        console.log('❌ OAuth flow failed or incomplete')
        console.log(`   Final URL: ${step6.url}`)
        console.log(`   Has error: ${step6.hasError}`)
        console.log(`   Auth state: ${step6.authState}`)
      }
      
      return step6.success
      
    } catch (error) {
      console.error('❌ Test failed with error:', error)
      await this.takeScreenshot('error', 'Test error occurred')
      return false
    } finally {
      // Keep browser open for manual inspection
      console.log('\n📱 Browser will remain open for manual inspection...')
      console.log('   Press Ctrl+C to close browser and exit')
      
      // Wait for manual termination
      process.on('SIGINT', async () => {
        console.log('\n🔄 Closing browser...')
        await this.cleanup()
        process.exit(0)
      })
    }
  }
}

// Run the test
const tester = new OAuthFlowTester()
tester.runFullTest().catch(console.error)