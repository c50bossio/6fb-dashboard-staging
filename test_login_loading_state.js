const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLoginLoadingState() {
    console.log('🚀 Starting login loading state test...');
    
    const browser = await puppeteer.launch({
        headless: false, // Show browser for debugging
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Enable console logging
        page.on('console', msg => {
            const type = msg.type().toUpperCase();
            const text = msg.text();
            console.log(`[CONSOLE ${type}] ${text}`);
        });

        // Listen for network requests
        page.on('response', response => {
            if (response.url().includes('auth') || response.url().includes('login')) {
                console.log(`[NETWORK] ${response.status()} ${response.url()}`);
            }
        });

        console.log('📍 Step 1: Navigating to login page...');
        await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle0' });

        // Take initial screenshot
        await page.screenshot({ path: 'login-initial-state.png', fullPage: true });
        console.log('📸 Screenshot saved: login-initial-state.png');

        console.log('📍 Step 2: Checking page elements...');
        
        // Wait for the page to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if form elements exist and are interactive
        const emailField = await page.$('input[type="email"], input[name="email"]');
        const passwordField = await page.$('input[type="password"], input[name="password"]');
        const loginButton = await page.$('button[type="submit"]') || await page.$('button');

        console.log('✅ Email field found:', !!emailField);
        console.log('✅ Password field found:', !!passwordField);
        console.log('✅ Login button found:', !!loginButton);

        if (!emailField || !passwordField || !loginButton) {
            console.log('🔍 Looking for alternative selectors...');
            const allInputs = await page.$$('input');
            const allButtons = await page.$$('button');
            console.log(`Found ${allInputs.length} input fields and ${allButtons.length} buttons`);
            
            // Get all input types
            for (let i = 0; i < allInputs.length; i++) {
                const type = await allInputs[i].evaluate(el => el.type);
                const name = await allInputs[i].evaluate(el => el.name || el.id || el.placeholder);
                console.log(`Input ${i}: type="${type}", identifier="${name}"`);
            }
            
            // Get all button text
            for (let i = 0; i < allButtons.length; i++) {
                const text = await allButtons[i].evaluate(el => el.textContent.trim());
                const disabled = await allButtons[i].evaluate(el => el.disabled);
                console.log(`Button ${i}: text="${text}", disabled=${disabled}`);
            }
        }

        // Check if fields are disabled (indicating loading state)
        if (emailField) {
            const emailDisabled = await emailField.evaluate(el => el.disabled);
            console.log('📧 Email field disabled:', emailDisabled);
        }

        if (passwordField) {
            const passwordDisabled = await passwordField.evaluate(el => el.disabled);
            console.log('🔒 Password field disabled:', passwordDisabled);
        }

        if (loginButton) {
            const buttonDisabled = await loginButton.evaluate(el => el.disabled);
            const buttonText = await loginButton.evaluate(el => el.textContent.trim());
            console.log('🔘 Login button disabled:', buttonDisabled);
            console.log('🔘 Login button text:', buttonText);
        }

        // Check for loading indicators
        const loadingIndicators = await page.$$('[class*="loading"], [class*="spinner"], .animate-spin');
        console.log('⏳ Loading indicators found:', loadingIndicators.length);

        // Look for authLoading state in console or DOM
        const authLoadingState = await page.evaluate(() => {
            // Check if there's any mention of authLoading in the DOM or global variables
            if (window.authLoading !== undefined) {
                return window.authLoading;
            }
            // Check localStorage
            const authState = localStorage.getItem('authState');
            if (authState) {
                try {
                    const parsed = JSON.parse(authState);
                    return parsed.loading || parsed.authLoading;
                } catch (e) {
                    return null;
                }
            }
            return null;
        });

        console.log('🔍 Auth loading state:', authLoadingState);

        console.log('📍 Step 3: Testing form interaction...');

        if (emailField && passwordField && loginButton) {
            // Test if we can type in the fields
            console.log('⌨️ Typing in email field...');
            await emailField.click();
            await emailField.type('demo@barbershop.com', { delay: 50 });

            console.log('⌨️ Typing in password field...');
            await passwordField.click();
            await passwordField.type('demo123', { delay: 50 });

            // Take screenshot after filling
            await page.screenshot({ path: 'login-fields-filled.png', fullPage: true });
            console.log('📸 Screenshot saved: login-fields-filled.png');

            // Check if button is still disabled after filling
            const buttonDisabledAfterFill = await loginButton.evaluate(el => el.disabled);
            console.log('🔘 Login button disabled after filling:', buttonDisabledAfterFill);

            console.log('📍 Step 4: Attempting to click login button...');
            
            if (!buttonDisabledAfterFill) {
                console.log('🖱️ Clicking login button...');
                await loginButton.click();
                
                // Wait a moment to see what happens
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Take screenshot after clicking
                await page.screenshot({ path: 'login-after-click.png', fullPage: true });
                console.log('📸 Screenshot saved: login-after-click.png');

                // Check for any error messages or success states
                const errorMessages = await page.$$('[class*="error"], [class*="alert"], [role="alert"]');
                console.log('❌ Error messages found:', errorMessages.length);

                if (errorMessages.length > 0) {
                    for (let i = 0; i < errorMessages.length; i++) {
                        const text = await errorMessages[i].evaluate(el => el.textContent.trim());
                        console.log(`Error ${i}: ${text}`);
                    }
                }

                // Check if we were redirected
                const currentUrl = page.url();
                console.log('🌐 Current URL after login attempt:', currentUrl);

                if (currentUrl !== 'http://localhost:9999/login') {
                    console.log('✅ Redirected away from login page - login may have succeeded');
                } else {
                    console.log('⚠️ Still on login page - login may have failed or be in progress');
                }
            } else {
                console.log('❌ Login button is disabled - cannot test click functionality');
            }

        } else {
            console.log('❌ Could not find all required form elements');
        }

        // Final check of the page state
        console.log('📍 Step 5: Final state check...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalAuthState = await page.evaluate(() => {
            return {
                url: window.location.href,
                authLoading: window.authLoading,
                localStorage: Object.keys(localStorage).map(key => ({
                    key,
                    value: localStorage.getItem(key)
                }))
            };
        });

        console.log('🔍 Final state:', JSON.stringify(finalAuthState, null, 2));

        // Take final screenshot
        await page.screenshot({ path: 'login-final-state.png', fullPage: true });
        console.log('📸 Screenshot saved: login-final-state.png');

        console.log('✅ Test completed successfully!');

        // Generate summary
        const summary = {
            timestamp: new Date().toISOString(),
            testResults: {
                pageLoaded: true,
                formElementsFound: !!(emailField && passwordField && loginButton),
                fieldsInteractive: emailField && passwordField ? !await emailField.evaluate(el => el.disabled) && !await passwordField.evaluate(el => el.disabled) : false,
                buttonClickable: loginButton ? !await loginButton.evaluate(el => el.disabled) : false,
                authLoadingState: authLoadingState,
                finalUrl: page.url()
            }
        };

        fs.writeFileSync('login-test-results.json', JSON.stringify(summary, null, 2));
        console.log('📊 Test results saved to login-test-results.json');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
if (require.main === module) {
    testLoginLoadingState().catch(console.error);
}

module.exports = testLoginLoadingState;