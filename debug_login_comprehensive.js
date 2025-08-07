// Comprehensive login debug script
// Run this in browser console at http://localhost:9999/login

console.clear();
console.log('=== Login Debug Session Started ===');

// Set up error tracking
let errors = [];
let networkRequests = [];
let authStateChanges = [];

// Monitor console errors
const originalError = console.error;
console.error = function(...args) {
    errors.push({
        timestamp: new Date().toISOString(),
        type: 'console_error',
        message: args.join(' ')
    });
    originalError.apply(console, arguments);
};

// Monitor network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    networkRequests.push({
        timestamp: new Date().toISOString(),
        type: 'fetch_start',
        url: url,
        method: args[1]?.method || 'GET'
    });
    
    return originalFetch.apply(this, arguments)
        .then(response => {
            networkRequests.push({
                timestamp: new Date().toISOString(),
                type: 'fetch_success',
                url: url,
                status: response.status,
                ok: response.ok
            });
            return response;
        })
        .catch(error => {
            networkRequests.push({
                timestamp: new Date().toISOString(),
                type: 'fetch_error',
                url: url,
                error: error.message
            });
            throw error;
        });
};

// Function to test login programmatically
window.testLogin = async function() {
    console.log('🧪 Starting automated login test...');
    
    const emailField = document.querySelector('input[name="email"]');
    const passwordField = document.querySelector('input[name="password"]');
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (!emailField || !passwordField || !submitButton) {
        console.error('❌ Login form elements not found');
        return;
    }
    
    // Clear any existing values
    emailField.value = '';
    passwordField.value = '';
    
    // Fill in demo credentials
    console.log('📝 Filling in demo credentials...');
    emailField.value = 'demo@barbershop.com';
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    emailField.dispatchEvent(new Event('change', { bubbles: true }));
    
    passwordField.value = 'demo123';
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Form filled. Current state:', {
        email: emailField.value,
        password: passwordField.value,
        buttonDisabled: submitButton.disabled,
        buttonText: submitButton.textContent
    });
    
    // Wait a moment for React state to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🚀 Clicking submit button...');
    submitButton.click();
    
    // Monitor for changes
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        console.log(`⏱️ Check ${checkCount}:`, {
            buttonDisabled: submitButton.disabled,
            buttonText: submitButton.textContent.trim(),
            currentPath: window.location.pathname,
            errors: errors.length,
            networkRequests: networkRequests.length
        });
        
        if (checkCount >= 30) { // Stop after 30 seconds
            clearInterval(checkInterval);
            console.log('⏰ Timeout reached. Final report:');
            console.log(window.getLoginDebugReport());
        }
        
        // If we've been redirected, stop monitoring
        if (window.location.pathname !== '/login') {
            clearInterval(checkInterval);
            console.log('✅ Redirected to:', window.location.pathname);
        }
    }, 1000);
};

// Function to get debug report
window.getLoginDebugReport = function() {
    return {
        timestamp: new Date().toISOString(),
        currentUrl: window.location.href,
        errors: errors,
        networkRequests: networkRequests,
        authStateChanges: authStateChanges,
        formState: {
            emailField: document.querySelector('input[name="email"]')?.value || 'not found',
            passwordField: document.querySelector('input[name="password"]')?.value || 'not found',
            submitButton: document.querySelector('button[type="submit"]')?.disabled || 'not found',
            loadingState: document.querySelector('button[type="submit"]')?.textContent?.includes('Signing in') || false
        },
        reactState: window.React ? 'React loaded' : 'React not found',
        supabaseState: window.supabase ? 'Supabase loaded' : 'Supabase not found'
    };
};

console.log('🔧 Debug monitoring set up!');
console.log('📋 Available commands:');
console.log('  - window.testLogin() - Automated login test');
console.log('  - window.getLoginDebugReport() - Get debug report');
console.log('');
console.log('📊 Current form state:', window.getLoginDebugReport().formState);