import puppeteer from 'puppeteer'

async function testSignOut() {
  console.log('🔍 Testing sign out functionality...')
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error') {
        console.log('❌ Browser Error:', text)
      } else if (text.includes('sign') || text.includes('Sign') || text.includes('auth')) {
        console.log(`Browser ${type}:`, text)
      }
    })
    
    // Navigate to the dashboard
    console.log('📍 Navigating to dashboard...')
    await page.goto('http://localhost:9999/dashboard', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })
    
    // Check if we're redirected to login (not authenticated)
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Not authenticated, need to login first')
      
      // Try demo login
      console.log('🔐 Attempting demo login...')
      await page.type('input[type="email"]', 'demo@barbershop.com')
      await page.type('input[type="password"]', 'demo123456')
      await page.click('button[type="submit"]')
      
      // Wait for navigation to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle0' })
    }
    
    // Now we should be on the dashboard
    console.log('📊 Current URL:', page.url())
    
    // Look for the profile dropdown button
    console.log('🔍 Looking for profile dropdown...')
    const profileButton = await page.$('button:has(.rounded-full)')
    
    if (profileButton) {
      console.log('✅ Found profile button, clicking to open dropdown...')
      await profileButton.click()
      await page.waitForTimeout(500)
      
      // Look for sign out button
      console.log('🔍 Looking for sign out button...')
      const signOutButton = await page.$('button:has-text("Sign Out")')
      
      if (signOutButton) {
        console.log('✅ Found sign out button, clicking...')
        
        // Listen for navigation
        const navigationPromise = page.waitForNavigation({ 
          waitUntil: 'networkidle0',
          timeout: 10000 
        }).catch(err => {
          console.log('⚠️ Navigation timeout or error:', err.message)
          return null
        })
        
        await signOutButton.click()
        
        // Wait for sign out to complete
        await navigationPromise
        
        console.log('📍 Final URL:', page.url())
        
        if (page.url().includes('/login')) {
          console.log('✅ Successfully signed out and redirected to login!')
        } else {
          console.log('❌ Sign out may have failed, still on:', page.url())
        }
      } else {
        console.log('❌ Sign out button not found in dropdown')
      }
    } else {
      console.log('❌ Profile dropdown button not found')
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    console.log('🔍 Keeping browser open for inspection...')
    // Keep browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 60000))
    await browser.close()
  }
}

testSignOut()