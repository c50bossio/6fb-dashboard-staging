const puppeteer = require('puppeteer');

async function debugLoginPage() {
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        });
    });
    
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.toString());
    });
    
    try {
        console.log('🔍 Navigating to login page...');
        await page.goto('http://localhost:9999/login', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to fully load and logs to appear...');
        await page.waitForTimeout(5000);
        
        console.log('📸 Taking screenshot...');
        await page.screenshot({ 
            path: 'login_debug_screenshot.png',
            fullPage: true 
        });
        
        console.log('🔍 Checking form state...');
        
        const formState = await page.evaluate(() => {
            const emailInput = document.querySelector('input[type="email"]');
            const passwordInput = document.querySelector('input[type="password"]');
            const submitButton = document.querySelector('button[type="submit"]');
            
            return {
                emailFound: !!emailInput,
                emailDisabled: emailInput ? emailInput.disabled : null,
                emailBackground: emailInput ? getComputedStyle(emailInput).backgroundColor : null,
                passwordFound: !!passwordInput,
                passwordDisabled: passwordInput ? passwordInput.disabled : null,
                passwordBackground: passwordInput ? getComputedStyle(passwordInput).backgroundColor : null,
                buttonFound: !!submitButton,
                buttonText: submitButton ? submitButton.textContent.trim() : null,
                buttonDisabled: submitButton ? submitButton.disabled : null,
                buttonBackground: submitButton ? getComputedStyle(submitButton).backgroundColor : null
            };
        });
        
        console.log('📋 Form State:');
        console.log(`  Email input: found=${formState.emailFound}, disabled=${formState.emailDisabled}, bg=${formState.emailBackground}`);
        console.log(`  Password input: found=${formState.passwordFound}, disabled=${formState.passwordDisabled}, bg=${formState.passwordBackground}`);
        console.log(`  Submit button: found=${formState.buttonFound}, text="${formState.buttonText}", disabled=${formState.buttonDisabled}, bg=${formState.buttonBackground}`);
        
        if (formState.emailFound && !formState.emailDisabled) {
            console.log('🧪 Testing email field interaction...');
            await page.focus('input[type="email"]');
            await page.type('input[type="email"]', 'test', { delay: 100 });
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            console.log('✅ Email field appears interactive');
        }
        
    } catch (error) {
        errors.push(error.message);
    }
    
    console.log('\n📝 All Console Messages:');
    consoleMessages.forEach(msg => {
        console.log(`  [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    const debugMessages = consoleMessages.filter(msg => 
        msg.text.includes('🔥') || 
        msg.text.toUpperCase().includes('LOGIN') || 
        msg.text.toLowerCase().includes('auth')
    );
    debugMessages.forEach(msg => {
        console.log(`  [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    console.log('\n❌ Page Errors:');
    errors.forEach(error => {
        console.log(`  ${error}`);
    });
    
    console.log('\n✅ Debugging complete. Browser will close in 3 seconds...');
    await page.waitForTimeout(3000);
    await browser.close();
}

debugLoginPage().catch(console.error);