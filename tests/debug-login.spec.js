import { test, expect } from '@playwright/test'

test('debug login page content', async ({ page }) => {
  await page.goto('http://localhost:9999/login')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/debug-login-page.png' })
  
  // Get page content
  const title = await page.title()
  console.log('Page title:', title)
  
  // Get all text content to see what's on the page
  const bodyText = await page.locator('body').textContent()
  console.log('Page text length:', bodyText?.length || 0)
  console.log('First 500 chars:', bodyText?.substring(0, 500) || 'No text')
  
  // Look for all buttons
  const buttons = await page.locator('button').all()
  console.log('Number of buttons found:', buttons.length)
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const buttonText = await button.textContent()
    const isVisible = await button.isVisible()
    console.log(`Button ${i + 1}: "${buttonText}" (visible: ${isVisible})`)
  }
  
  // Scroll down to see if more content appears
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(2000)
  
  // Check for buttons again after scroll
  const buttonsAfterScroll = await page.locator('button').all()
  console.log('Number of buttons after scroll:', buttonsAfterScroll.length)
  
  for (let i = 0; i < buttonsAfterScroll.length; i++) {
    const button = buttonsAfterScroll[i]
    const buttonText = await button.textContent()
    const isVisible = await button.isVisible()
    console.log(`Button after scroll ${i + 1}: "${buttonText}" (visible: ${isVisible})`)
  }
  
  // Take another screenshot after scroll
  await page.screenshot({ path: 'test-results/debug-login-page-scrolled.png' })
  
  // Check current URL
  console.log('Current URL:', page.url())
})