

setTimeout(async () => {
    try {

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

        emailField.value = 'demo@barbershop.com';
        passwordField.value = 'demo123';
        
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 100));

        submitButton.click();
        
        let redirected = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const currentUrl = window.location.href;
            const currentButton = document.querySelector('button[type="submit"]');
            const errorMessages = document.querySelectorAll('[class*="red"], .error, [class*="error"]');

            if (currentUrl.includes('/dashboard')) {
                
                redirected = true;
                break;
            }
            
            if (errorMessages.length > 0) {
                .map(el => el.textContent));
            }
            
            if (currentButton && currentButton.textContent.includes('Signing in')) {
                
            }
        }
        
        if (!redirected) {
            
            ?.textContent,
                errors: Array.from(document.querySelectorAll('[class*="red"], .error')).map(el => el.textContent)
            });
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}, 2000);

