

async function finalLoginTest() {
    try {

        if (!window.location.pathname.includes('/login')) {
            
            window.location.href = 'http://localhost:9999/login';
            
            setTimeout(finalLoginTest, 3000);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

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

        ,
            disabled: submitButton.disabled,
            classes: submitButton.className
        });

        emailField.value = 'demo@barbershop.com';
        passwordField.value = 'demo123';
        
        ['input', 'change', 'blur'].forEach(eventType => {
            emailField.dispatchEvent(new Event(eventType, { bubbles: true }));
            passwordField.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        ,
            disabled: submitButton.disabled
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));

        submitButton.click();

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

            if (status.onDashboard) {

                return true;
            }
            
            if (status.errors.length > 0) {
                
            }
            
            if (status.buttonText.includes('Signing in') && i > 10) {
                
            }
        }

        ?.textContent,
            errors: Array.from(document.querySelectorAll('[class*="red"], .error')).map(el => el.textContent)
        });
        
        return false;
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    }
}

setTimeout(async () => {
    const success = await finalLoginTest();
    
    if (success) {

    } else {

    }
}, 2000);