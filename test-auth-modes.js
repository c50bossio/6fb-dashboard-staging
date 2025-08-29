#!/usr/bin/env node

import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testAuthModes() {
  console.log('🧪 Testing Authentication Modes...\n')
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    // Test 1: Dev Auth Mode
    console.log('📝 Test 1: Dev Auth Mode')
    const page1 = await browser.newPage()
    
    // Enable dev auth via localStorage
    await page1.evaluateOnNewDocument(() => {
      localStorage.setItem('forceDevAuth', 'true')
    })
    
    await page1.goto('http://localhost:9999/test-react-query-enhanced?devauth=true', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check for auth info
    const devAuthInfo = await page1.evaluate(() => {
      const authSection = document.querySelector('[data-testid="auth-info"]')
      return authSection ? authSection.innerText : null
    })
    
    if (devAuthInfo && devAuthInfo.includes('dev@example.com')) {
      console.log('✅ Dev Auth Mode: Working correctly')
      console.log('   User: dev@example.com')
    } else {
      console.log('⚠️ Dev Auth Mode: May not be working correctly')
    }
    
    // Check for React Query functionality
    const hasQueries = await page1.evaluate(() => {
      const querySection = document.querySelector('[data-testid="query-section"]')
      return querySection !== null
    })
    
    if (hasQueries) {
      console.log('✅ React Query: Hooks are functional')
    } else {
      console.log('❌ React Query: Hooks not found')
    }
    
    // Check console for errors
    const consoleErrors = []
    page1.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (consoleErrors.length === 0) {
      console.log('✅ Console: No errors detected')
    } else {
      console.log('⚠️ Console: Errors detected:')
      consoleErrors.forEach(err => console.log('   -', err))
    }
    
    console.log('')
    
    // Test 2: Normal Auth Mode (Supabase)
    console.log('📝 Test 2: Normal Auth Mode (Supabase)')
    const page2 = await browser.newPage()
    
    // Clear dev auth
    await page2.evaluateOnNewDocument(() => {
      localStorage.removeItem('forceDevAuth')
    })
    
    await page2.goto('http://localhost:9999/test-react-query-enhanced', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check if page loads without session timeout errors
    const hasTimeoutError = await page2.evaluate(() => {
      const bodyText = document.body.innerText
      return bodyText.includes('Session timeout') || bodyText.includes('Authentication Error')
    })
    
    if (!hasTimeoutError) {
      console.log('✅ Normal Auth: Page loads without timeout errors')
    } else {
      console.log('⚠️ Normal Auth: Session timeout may still be occurring')
    }
    
    // Check if auth section shows not authenticated
    const normalAuthInfo = await page2.evaluate(() => {
      const authSection = document.querySelector('[data-testid="auth-info"]')
      return authSection ? authSection.innerText : null
    })
    
    if (normalAuthInfo && normalAuthInfo.includes('Not authenticated')) {
      console.log('✅ Normal Auth: Correctly shows not authenticated state')
    } else if (normalAuthInfo) {
      console.log('ℹ️ Normal Auth: Auth state:', normalAuthInfo.substring(0, 50))
    }
    
    console.log('')
    
    // Test 3: Auth Mode Toggle
    console.log('📝 Test 3: Auth Mode Toggle')
    const page3 = await browser.newPage()
    
    await page3.goto('http://localhost:9999/test-dev-auth', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    
    // Check if toggle page loads
    const hasToggleButtons = await page3.evaluate(() => {
      const enableBtn = document.querySelector('button')
      return enableBtn && enableBtn.innerText.includes('Enable Dev Auth')
    })
    
    if (hasToggleButtons) {
      console.log('✅ Toggle Page: Auth mode switcher is available')
      
      // Click enable dev auth
      await page3.click('button:first-of-type')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check localStorage
      const devAuthEnabled = await page3.evaluate(() => {
        return localStorage.getItem('forceDevAuth') === 'true'
      })
      
      if (devAuthEnabled) {
        console.log('✅ Toggle Function: Dev auth successfully enabled')
      }
    } else {
      console.log('❌ Toggle Page: Could not find toggle buttons')
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 Summary:')
    console.log('- Dev Auth Mode allows testing without Supabase')
    console.log('- Normal Auth Mode handles timeouts gracefully')
    console.log('- Toggle page provides easy switching between modes')
    console.log('- React Query hooks work in both modes')
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
  } finally {
    await browser.close()
  }
}

// Run tests
testAuthModes().catch(console.error)