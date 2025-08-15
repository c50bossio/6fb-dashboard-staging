
console.log('🔍 Testing login after authentication provider fix...');

setTimeout(async () => {
    try {
        console.log('🔍 Page loaded. Current URL:', window.location.href);
        
        const emailField = document.querySelector('input[type="email"]');
        const passwordField = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!emailField || !passwordField || !submitButton) {
            console.error('❌ Form elements not found:', {
                email: !!emailField,
                password: !!passwordField,
                submit: !!submitButton
            });
            return;
        }
        
        console.log('✅ Form elements found');
        console.log('🔍 Button initial state:', {
            text: submitButton.textContent,
            disabled: submitButton.disabled,
            className: submitButton.className
        });
        
        emailField.value = 'demo@barbershop.com';
        passwordField.value = 'demo123';
        
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('✅ Form filled');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🔍 Submitting form...');
        submitButton.click();
        
        let redirected = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const currentUrl = window.location.href;
            const currentButton = document.querySelector('button[type="submit"]');
            const errorMessages = document.querySelectorAll('[class*="red"], .error, [class*="error"]');
            
            console.log(`🔍 Check ${i + 1}/15:`, {
                url: currentUrl,
                buttonText: currentButton?.textContent || 'not found',
                buttonDisabled: currentButton?.disabled || false,
                errorCount: errorMessages.length
            });
            
            if (currentUrl.includes('/dashboard')) {
                console.log('✅ SUCCESS: Redirected to dashboard!');
                redirected = true;
                break;
            }
            
            if (errorMessages.length > 0) {
                console.log('❌ Errors found:', Array.from(errorMessages).map(el => el.textContent));
            }
            
            if (currentButton && currentButton.textContent.includes('Signing in')) {
                console.log('⏳ Button still in loading state...');
            }
        }
        
        if (!redirected) {
            console.log('❌ Login did not complete successfully');
            console.log('Final state:', {
                url: window.location.href,
                button: document.querySelector('button[type="submit"]')?.textContent,
                errors: Array.from(document.querySelectorAll('[class*="red"], .error')).map(el => el.textContent)
            });
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}, 2000);

console.log('🔍 Test will start in 2 seconds...');