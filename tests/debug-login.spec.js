import { test, expect } from '@playwright/test'

test('debug login page content', async ({ page }) => {
  await page.goto('http://localhost:9999/login')
  
  await page.waitForLoadState('networkidle')
  
  await page.screenshot({ path: 'test-results/debug-login-page.png' })
  
  const title = await page.title()
  console.log('Page title:', title)
  
  const bodyText = await page.locator('body').textContent()
  console.log('Page text length:', bodyText?.length || 0)
  console.log('First 500 chars:', bodyText?.substring(0, 500) || 'No text')
  
  const buttons = await page.locator('button').all()
  console.log('Number of buttons found:', buttons.length)
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const buttonText = await button.textContent()
    const isVisible = await button.isVisible()
    console.log(`Button ${i + 1}: "${buttonText}" (visible: ${isVisible})`)
  }
  
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(2000)
  
  const buttonsAfterScroll = await page.locator('button').all()
  console.log('Number of buttons after scroll:', buttonsAfterScroll.length)
  
  for (let i = 0; i < buttonsAfterScroll.length; i++) {
    const button = buttonsAfterScroll[i]
    const buttonText = await button.textContent()
    const isVisible = await button.isVisible()
    console.log(`Button after scroll ${i + 1}: "${buttonText}" (visible: ${isVisible})`)
  }
  
  await page.screenshot({ path: 'test-results/debug-login-page-scrolled.png' })
  
  console.log('Current URL:', page.url())
})