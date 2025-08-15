import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('simple login page debug', async ({ page }) => {
  
  await page.goto('http://localhost:9999/login')
  console.log('Navigated to login page')
  
  await page.waitForLoadState('domcontentloaded')
  console.log('DOM content loaded')
  
  const title = await page.title()
  console.log('Page title:', title)
  
  const html = await page.content()
  console.log('HTML length:', html.length)
  
  const forms = await page.locator('form').count()
  console.log('Number of forms:', forms)
  
  const inputs = await page.locator('input').count()
  console.log('Number of inputs:', inputs)
  
  const buttons = await page.locator('button').count()
  console.log('Number of buttons:', buttons)
  
  const buttonElements = await page.locator('button').all()
  for (let i = 0; i < buttonElements.length; i++) {
    const text = await buttonElements[i].textContent()
    console.log(`Button ${i + 1}: "${text}"`)
  }
  
  const bodyText = await page.locator('body').textContent()
  const hasDevText = bodyText?.toLowerCase().includes('dev') || 
                    bodyText?.toLowerCase().includes('bypass') ||
                    bodyText?.toLowerCase().includes('localhost')
  console.log('Has dev/bypass/localhost text:', hasDevText)
  
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
  
  await page.screenshot({ path: 'test-results/simple-debug-screenshot.png', fullPage: true })
  
  expect(title).toBeTruthy()
})