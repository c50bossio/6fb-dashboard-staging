const { chromium } = require('playwright');

async function analyzeSignupFlow() {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {

    ');
    ');
    ');
    ');

    await page.goto('http://localhost:9999');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/screenshots/01-homepage.png' });

    const signupButtons = await page.locator('text=/sign.*up|register|get.*started|start.*free/i').all();

    for (let i = 0; i < signupButtons.length; i++) {
      const text = await signupButtons[i].textContent();
      const href = await signupButtons[i].getAttribute('href') || 'No href';
      }" → ${href}`);
    }

    const primarySignup = page.locator('text=/get.*started|sign.*up|register|start.*free/i').first();
    
    if (await primarySignup.count() > 0) {
      const buttonText = await primarySignup.textContent();
      }"`);
      
      await primarySignup.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();

      await page.screenshot({ path: 'test-results/screenshots/02-after-signup-click.png' });
      
      const pageTitle = await page.locator('h1').first().textContent().catch(() => 'No title');

      const hasPlanSelection = await page.locator('text=/plan|pricing|choose/i').count() > 0;
      const hasAuthForm = await page.locator('text=/sign.*in|login|google|email.*password/i').count() > 0;

      if (hasPlanSelection) {

        const planButtons = await page.locator('button:has-text("Start as")').all();
        
        if (planButtons.length > 0) {
          
          for (let i = 0; i < planButtons.length; i++) {
            const planText = await planButtons[i].textContent();
            }`);
          }
          
          const firstPlan = planButtons[0];
          const planName = await firstPlan.textContent();
          }"`);
          
          await firstPlan.click();
          await page.waitForLoadState('networkidle');
          
          const afterPlanUrl = page.url();

          await page.screenshot({ path: 'test-results/screenshots/03-after-plan-selection.png' });
          
          const nowHasAuth = await page.locator('text=/google.*sign|continue.*google|oauth/i').count() > 0;
          if (nowHasAuth) {
            
          } else {
            
          }
        }
      } else if (hasAuthForm) {

        const authOptions = await page.locator('button:has-text("Google"), button:has-text("Sign"), input[type="email"]').all();

      } else {

        const allButtons = await page.locator('button').all();
        
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          const text = await allButtons[i].textContent();
          }"`);
        }
      }
      
    } else {
      
    }

    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/screenshots/04-direct-pricing.png' });
    
    const pricingPageHasPlans = await page.locator('text=/individual.*barber|barbershop|enterprise/i').count() > 0;
    const pricingPageHasAuth = await page.locator('button:has-text("Start as")').count() > 0;

    if (pricingPageHasAuth) {
      
      const startButton = page.locator('button:has-text("Start as Individual")').first();
      
      if (await startButton.count() > 0) {
        
        await startButton.click();
        await page.waitForLoadState('networkidle');
        
        const afterClickUrl = page.url();

        await page.screenshot({ path: 'test-results/screenshots/05-after-plan-click.png' });
        
        const hasOAuthFlow = afterClickUrl.includes('oauth') || afterClickUrl.includes('google') || 
                           await page.locator('text=/continue.*google|sign.*google/i').count() > 0;
        
        if (hasOAuthFlow) {
          
        } else {
          
        }
      }
    }

    ');

    ');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeSignupFlow().catch(console.error);