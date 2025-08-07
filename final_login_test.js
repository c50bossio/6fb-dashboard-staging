// Final Login Test - Run this in browser console
// This tests that the authentication provider conflicts are resolved

console.log('🔍 FINAL LOGIN TEST - Testing authentication provider fix');

// Test function
async function finalLoginTest() {
    try {
        console.log('🔍 1. Checking current page...');
        console.log('URL:', window.location.href);
        console.log('Title:', document.title);
        
        // Navigate to login if not already there
        if (!window.location.pathname.includes('/login')) {
            console.log('🔍 Navigating to login page...');
            window.location.href = 'http://localhost:9999/login';
            
            // Wait for navigation and try again
            setTimeout(finalLoginTest, 3000);
            return;
        }
        
        console.log('🔍 2. Waiting for page to fully load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 3. Checking form elements...');
        const emailField = document.querySelector('input[type="email"]');
        const passwordField = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!emailField || !passwordField || !submitButton) {
            console.error('❌ Form elements missing:', {
                email: !!emailField,
                password: !!passwordField,
                submit: !!submitButton
            });
            return;
        }
        
        console.log('✅ Form elements found');
        
        console.log('🔍 4. Checking for loading states...');
        console.log('Button state:', {
            text: submitButton.textContent.trim(),
            disabled: submitButton.disabled,
            classes: submitButton.className
        });
        
        console.log('🔍 5. Filling form...');
        emailField.value = 'demo@barbershop.com';
        passwordField.value = 'demo123';
        
        // Trigger all necessary events
        ['input', 'change', 'blur'].forEach(eventType => {
            emailField.dispatchEvent(new Event(eventType, { bubbles: true }));
            passwordField.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        console.log('✅ Form filled');
        
        console.log('🔍 6. Checking button state before submit...');
        console.log('Button before submit:', {
            text: submitButton.textContent.trim(),
            disabled: submitButton.disabled
        });
        
        // Wait a moment for React to process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔍 7. Submitting form...');
        submitButton.click();
        
        console.log('🔍 8. Monitoring login process...');
        
        // Monitor for 20 seconds
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const currentUrl = window.location.href;
            const currentButton = document.querySelector('button[type="submit"]');
            const errorElements = document.querySelectorAll('[class*="red"], .error, [class*="error"]');
            
            const status = {
                second: i + 1,
                url: currentUrl,
                onDashboard: currentUrl.includes('/dashboard'),
                buttonText: currentButton?.textContent?.trim() || 'not found',
                buttonDisabled: currentButton?.disabled || false,
                errors: Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text)
            };
            
            console.log(`🔍 Status ${status.second}/20:`, status);
            
            // Success condition
            if (status.onDashboard) {
                console.log('🎉 SUCCESS! Login completed and redirected to dashboard');
                console.log('✅ Authentication provider conflicts are resolved');
                return true;
            }
            
            // Check for specific error conditions
            if (status.errors.length > 0) {
                console.log('❌ Visible errors:', status.errors);
            }
            
            // Check if button is stuck
            if (status.buttonText.includes('Signing in') && i > 10) {
                console.log('⚠️ Button appears stuck in loading state');
            }
        }
        
        console.log('❌ Login did not complete within 20 seconds');
        console.log('Final state:', {
            url: window.location.href,
            buttonText: document.querySelector('button[type="submit"]')?.textContent,
            errors: Array.from(document.querySelectorAll('[class*="red"], .error')).map(el => el.textContent)
        });
        
        return false;
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    }
}

// Auto-start test
console.log('🔍 Starting final login test in 2 seconds...');
setTimeout(async () => {
    const success = await finalLoginTest();
    
    if (success) {
        console.log('\n🎉 =============== TEST PASSED ===============');
        console.log('✅ Login is working correctly!');
        console.log('✅ Authentication provider conflicts resolved!');
        console.log('✅ User can successfully authenticate and access dashboard!');
    } else {
        console.log('\n❌ =============== TEST FAILED ===============');
        console.log('❌ Login is still not working properly');
        console.log('❌ Further debugging needed');
    }
}, 2000);