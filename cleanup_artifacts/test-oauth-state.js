// Test script to verify OAuth button state
import puppeteer from 'puppeteer';

async function testOAuthButton() {
  console.log('🧪 Testing Google OAuth Button State on bookedbarber.com');
  console.log('=========================================================\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('📱 Navigating to https://bookedbarber.com/register...');
    await page.goto('https://bookedbarber.com/register', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the Google OAuth button to be present
    await page.waitForSelector('button:has-text("Sign up with Google")', { 
      timeout: 10000 
    }).catch(() => {
      // Try alternative selector
      return page.waitForSelector('button', { timeout: 5000 });
    });
    
    console.log('✅ Page loaded successfully\n');
    
    // Check if OAuth button exists and its state
    const buttonState = await page.evaluate(() => {
      // Find the Google OAuth button
      const buttons = Array.from(document.querySelectorAll('button'));
      const googleButton = buttons.find(btn => 
        btn.textContent.includes('Google') || 
        btn.textContent.includes('Signing up')
      );
      
      if (!googleButton) {
        return { found: false };
      }
      
      return {
        found: true,
        text: googleButton.textContent.trim(),
        disabled: googleButton.disabled,
        isLoading: googleButton.textContent.includes('Signing up'),
        hasSpinner: !!googleButton.querySelector('.animate-spin'),
        className: googleButton.className
      };
    });
    
    console.log('🔍 Google OAuth Button Analysis:');
    console.log('================================');
    
    if (!buttonState.found) {
      console.log('❌ Google OAuth button not found on page');
    } else {
      console.log(`✅ Button found`);
      console.log(`📝 Text: "${buttonState.text}"`);
      console.log(`🔒 Disabled: ${buttonState.disabled ? 'Yes ❌' : 'No ✅'}`);
      console.log(`⏳ Loading state: ${buttonState.isLoading ? 'Yes ⚠️' : 'No ✅'}`);
      console.log(`🔄 Has spinner: ${buttonState.hasSpinner ? 'Yes' : 'No'}`);
      
      if (buttonState.isLoading || buttonState.disabled) {
        console.log('\n⚠️  ISSUE DETECTED: Button is in loading/disabled state');
        console.log('This indicates the auth provider may still be initializing with loading=true');
      } else {
        console.log('\n✅ Button is in correct state - ready for user interaction');
      }
    }
    
    // Check for any console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to collect any errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/oauth-button-state.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved to Desktop/oauth-button-state.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n📊 Test Complete');
  console.log('================');
  console.log('Next Steps:');
  console.log('1. If button shows "Signing up..." - Auth provider loading state issue persists');
  console.log('2. If button shows "Sign up with Google" - Issue is resolved ✅');
  console.log('3. Check the screenshot for visual confirmation');
}

testOAuthButton().catch(console.error);