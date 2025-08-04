import { test, expect } from '@playwright/test'

// Configure the test to not depend on auth setup
test.use({ storageState: { cookies: [], origins: [] } })

test('simple login page debug', async ({ page }) => {
  console.log('Starting simple debug test...')
  
  // Go directly to login page
  await page.goto('http://localhost:9999/login')
  console.log('Navigated to login page')
  
  // Wait for page to stabilize
  await page.waitForLoadState('domcontentloaded')
  console.log('DOM content loaded')
  
  // Check if page loaded at all
  const title = await page.title()
  console.log('Page title:', title)
  
  // Get page HTML for inspection
  const html = await page.content()
  console.log('HTML length:', html.length)
  
  // Look for any form elements
  const forms = await page.locator('form').count()
  console.log('Number of forms:', forms)
  
  // Look for input fields
  const inputs = await page.locator('input').count()
  console.log('Number of inputs:', inputs)
  
  // Look for all buttons
  const buttons = await page.locator('button').count()
  console.log('Number of buttons:', buttons)
  
  // Get button texts
  const buttonElements = await page.locator('button').all()
  for (let i = 0; i < buttonElements.length; i++) {
    const text = await buttonElements[i].textContent()
    console.log(`Button ${i + 1}: "${text}"`)
  }
  
  // Check for text that might indicate dev bypass
  const bodyText = await page.locator('body').textContent()
  const hasDevText = bodyText?.toLowerCase().includes('dev') || 
                    bodyText?.toLowerCase().includes('bypass') ||
                    bodyText?.toLowerCase().includes('localhost')
  console.log('Has dev/bypass/localhost text:', hasDevText)
  
  // Scroll down and check again
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  await page.waitForTimeout(1000)
  
  const buttonsAfterScroll = await page.locator('button').count()
  console.log('Number of buttons after scroll:', buttonsAfterScroll)
  
  if (buttonsAfterScroll > buttons) {
    console.log('New buttons appeared after scrolling!')
    const newButtonElements = await page.locator('button').all()
    for (let i = 0; i < newButtonElements.length; i++) {
      const text = await newButtonElements[i].textContent()
      console.log(`Button after scroll ${i + 1}: "${text}"`)
    }
  }
  
  // Take a screenshot for manual inspection
  await page.screenshot({ path: 'test-results/simple-debug-screenshot.png', fullPage: true })
  console.log('Screenshot saved to test-results/simple-debug-screenshot.png')
  
  // Basic assertion to ensure test doesn't fail
  expect(title).toBeTruthy()
})