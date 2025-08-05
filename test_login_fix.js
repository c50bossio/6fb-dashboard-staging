// Test script to verify login fix
// Run this in browser console after navigating to http://localhost:9999/login

console.log('🔍 Testing login after authentication provider fix...');

// Wait for page to load
setTimeout(async () => {
    try {
        console.log('🔍 Page loaded. Current URL:', window.location.href);
        
        // Check if form elements exist
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
        
        // Fill the form
        emailField.value = 'demo@barbershop.com';
        passwordField.value = 'demo123';
        
        // Trigger events
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('✅ Form filled');
        
        // Wait a moment then submit
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🔍 Submitting form...');
        submitButton.click();
        
        // Monitor for 15 seconds
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
            
            // Check for success
            if (currentUrl.includes('/dashboard')) {
                console.log('✅ SUCCESS: Redirected to dashboard!');
                redirected = true;
                break;
            }
            
            // Check for errors
            if (errorMessages.length > 0) {
                console.log('❌ Errors found:', Array.from(errorMessages).map(el => el.textContent));
            }
            
            // Check if button is stuck in loading
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