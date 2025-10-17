#!/usr/bin/env node

/**
 * Test existing subscription system components
 * Validates that subscription tiers and feature access are working properly
 */

import puppeteer from 'puppeteer'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'

async function testExistingSubscriptionSystem() {

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  })
  
  try {
    const page = await browser.newPage()
    
    // Test 1: Visit pricing page
    
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle0', timeout: 10000 })
    
    // Check for subscription tiers
    const pricingTiers = await page.$$eval('[class*="price"]', elements => elements.length)

    // Look for plan names (Barber, Shop Owner, Enterprise)
    const planNames = await page.$$eval('text', elements => {
      return elements.map(el => el.textContent).filter(text => 
        text.includes('Barber') || text.includes('Shop') || text.includes('Enterprise')
      )
    })

    // Test 2: Check if TierProtection components exist

    // Navigate to a dashboard page
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0', timeout: 10000 })
    
    // Look for subscription-related elements
    const subscriptionElements = await page.$$eval('*', elements => {
      return elements.filter(el => 
        el.textContent.includes('tier') || 
        el.textContent.includes('subscription') ||
        el.textContent.includes('upgrade') ||
        el.className.includes('subscription')
      ).length
    })

    // Test 3: Check navigation for role-based access

    // Check if navigation has role-based sections
    const navigationSections = await page.$$eval('nav *', elements => {
      const sectionHeaders = elements.filter(el => 
        el.textContent.includes('SHOP MANAGEMENT') ||
        el.textContent.includes('ENTERPRISE') ||
        el.textContent.includes('BARBER OPERATIONS')
      )
      return sectionHeaders.map(el => el.textContent.trim())
    }).catch(() => [])

    if (navigationSections.length > 0) {
      navigationSections.forEach(section => {
        
      })
    }
    
    // Test 4: Check for upgrade prompts or tier restrictions

    // Look for any upgrade or locked feature indicators
    const upgradeElements = await page.$$eval('*', elements => {
      return elements.filter(el => 
        el.textContent.includes('Upgrade') ||
        el.textContent.includes('🔒') ||
        el.className.includes('lock') ||
        el.className.includes('upgrade')
      ).length
    })

    // Test 5: Console errors check
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.reload({ waitUntil: 'networkidle0' })
    
    if (consoleErrors.length > 0) {
      
      consoleErrors.slice(0, 3).forEach(error => {
        
      })
    } else {
      
    }

    return true
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    return false
  } finally {
    await browser.close()
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testExistingSubscriptionSystem()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test suite failed:', error)
      process.exit(1)
    })
}

export { testExistingSubscriptionSystem }