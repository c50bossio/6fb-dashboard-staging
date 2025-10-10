const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLoginLoadingState() {

    const browser = await puppeteer.launch({
        headless: false, // Show browser for debugging
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        page.on('console', msg => {
            const type = msg.type().toUpperCase();
            const text = msg.text();
            
        });

        page.on('response', response => {
            if (response.url().includes('auth') || response.url().includes('login')) {
                } ${response.url()}`);
            }
        });

        await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle0' });

        await page.screenshot({ path: 'login-initial-state.png', fullPage: true });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const emailField = await page.$('input[type="email"], input[name="email"]');
        const passwordField = await page.$('input[type="password"], input[name="password"]');
        const loginButton = await page.$('button[type="submit"]') || await page.$('button');

        if (!emailField || !passwordField || !loginButton) {
            
            const allInputs = await page.$$('input');
            const allButtons = await page.$$('button');

            for (let i = 0; i < allInputs.length; i++) {
                const type = await allInputs[i].evaluate(el => el.type);
                const name = await allInputs[i].evaluate(el => el.name || el.id || el.placeholder);
                
            }
            
            for (let i = 0; i < allButtons.length; i++) {
                const text = await allButtons[i].evaluate(el => el.textContent.trim());
                const disabled = await allButtons[i].evaluate(el => el.disabled);
                
            }
        }

        if (emailField) {
            const emailDisabled = await emailField.evaluate(el => el.disabled);
            
        }

        if (passwordField) {
            const passwordDisabled = await passwordField.evaluate(el => el.disabled);
            
        }

        if (loginButton) {
            const buttonDisabled = await loginButton.evaluate(el => el.disabled);
            const buttonText = await loginButton.evaluate(el => el.textContent.trim());

        }

        const loadingIndicators = await page.$$('[class*="loading"], [class*="spinner"], .animate-spin');

        const authLoadingState = await page.evaluate(() => {
            if (window.authLoading !== undefined) {
                return window.authLoading;
            }
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

        if (emailField && passwordField && loginButton) {
            
            await emailField.click();
            await emailField.type('demo@barbershop.com', { delay: 50 });

            await passwordField.click();
            await passwordField.type('demo123', { delay: 50 });

            await page.screenshot({ path: 'login-fields-filled.png', fullPage: true });

            const buttonDisabledAfterFill = await loginButton.evaluate(el => el.disabled);

            if (!buttonDisabledAfterFill) {
                
                await loginButton.click();
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                await page.screenshot({ path: 'login-after-click.png', fullPage: true });

                const errorMessages = await page.$$('[class*="error"], [class*="alert"], [role="alert"]');

                if (errorMessages.length > 0) {
                    for (let i = 0; i < errorMessages.length; i++) {
                        const text = await errorMessages[i].evaluate(el => el.textContent.trim());
                        
                    }
                }

                const currentUrl = page.url();

                if (currentUrl !== 'http://localhost:9999/login') {
                    
                } else {
                    
                }
            } else {
                
            }

        } else {
            
        }

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

        );

        await page.screenshot({ path: 'login-final-state.png', fullPage: true });

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

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    testLoginLoadingState().catch(console.error);
}

module.exports = testLoginLoadingState;