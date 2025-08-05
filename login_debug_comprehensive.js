// Comprehensive Login Debug Script
// This script should be pasted into the browser console on the login page
// It will monitor all aspects of the login process and identify the root cause

console.log('🔍 COMPREHENSIVE LOGIN DEBUG STARTED');
console.log('🔍 Current URL:', window.location.href);
console.log('🔍 User Agent:', navigator.userAgent);

// Global debug state
let debugState = {
    logs: [],
    networkRequests: [],
    errors: [],
    startTime: Date.now()
};

// Utility function to log with timestamp
function debugLog(type, message, data) {
    const timestamp = Date.now() - debugState.startTime;
    const logEntry = {
        timestamp,
        type,
        message,
        data: data || null
    };
    debugState.logs.push(logEntry);
    console.log(`🔍 [${timestamp}ms] ${type.toUpperCase()}: ${message}`, data || '');
}

// 1. Override console methods to capture all logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function(...args) {
    debugState.logs.push({
        timestamp: Date.now() - debugState.startTime,
        type: 'console_log',
        args: args
    });
    return originalConsoleLog.apply(this, ['🔍 LOG:', ...args]);
};

console.error = function(...args) {
    debugState.errors.push({
        timestamp: Date.now() - debugState.startTime,
        type: 'console_error',
        args: args
    });
    return originalConsoleError.apply(this, ['🚨 ERROR:', ...args]);
};

console.warn = function(...args) {
    debugState.logs.push({
        timestamp: Date.now() - debugState.startTime,
        type: 'console_warn',
        args: args
    });
    return originalConsoleWarn.apply(this, ['⚠️ WARN:', ...args]);
};

// 2. Monitor fetch requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const [url, options] = args;
    const requestStart = Date.now();
    
    debugLog('fetch_request', `Starting request to ${url}`, { url, options });
    
    try {
        const response = await originalFetch.apply(this, args);
        const requestEnd = Date.now();
        const duration = requestEnd - requestStart;
        
        debugLog('fetch_response', `Response from ${url}`, {
            url,
            status: response.status,
            statusText: response.statusText,
            duration
        });
        
        // For auth-related requests, try to read the response
        if (url.includes('/api/auth/') || url.includes('supabase')) {
            try {
                const responseClone = response.clone();
                const responseText = await responseClone.text();
                debugLog('fetch_body', `Response body from ${url}`, responseText);
            } catch (e) {
                debugLog('fetch_error', `Could not read response body from ${url}`, e.message);
            }
        }
        
        return response;
    } catch (error) {
        const requestEnd = Date.now();
        debugLog('fetch_error', `Fetch error for ${url}`, {
            url,
            error: error.message,
            duration: requestEnd - requestStart
        });
        throw error;
    }
};

// 3. Monitor all JavaScript errors
window.addEventListener('error', (event) => {
    debugState.errors.push({
        timestamp: Date.now() - debugState.startTime,
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    debugLog('js_error', `JavaScript error: ${event.message}`, {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
    });
});

// 4. Monitor unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    debugState.errors.push({
        timestamp: Date.now() - debugState.startTime,
        type: 'unhandled_rejection',
        reason: event.reason
    });
    debugLog('promise_rejection', 'Unhandled promise rejection', event.reason);
});

// 5. Monitor DOM changes for loading states and error messages
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        // Check for loading state changes
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const element = mutation.target;
            if (element.className && (element.className.includes('loading') || element.className.includes('disabled'))) {
                debugLog('loading_state', 'Loading state changed', {
                    element: element.tagName,
                    className: element.className
                });
            }
        }
        
        // Check for new error messages
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.textContent && (node.textContent.includes('error') || node.textContent.includes('failed'))) {
                        debugLog('error_message', 'Error message appeared', node.textContent);
                    }
                    if (node.className && (node.className.includes('error') || node.className.includes('red'))) {
                        debugLog('error_element', 'Error element added', {
                            className: node.className,
                            textContent: node.textContent
                        });
                    }
                }
            });
        }
    });
});

observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['class']
});

// 6. Function to perform login test
window.performLoginTest = async function() {
    debugLog('test_start', 'Starting comprehensive login test');
    
    // Step 1: Check form elements
    const emailField = document.querySelector('input[type="email"], input[name="email"]');
    const passwordField = document.querySelector('input[type="password"], input[name="password"]');
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (!emailField || !passwordField || !submitButton) {
        debugLog('test_error', 'Form elements not found', {
            emailField: !!emailField,
            passwordField: !!passwordField,
            submitButton: !!submitButton
        });
        return;
    }
    
    debugLog('test_info', 'Form elements found', {
        emailField: emailField.tagName + (emailField.name ? `[name="${emailField.name}"]` : ''),
        passwordField: passwordField.tagName + (passwordField.name ? `[name="${passwordField.name}"]` : ''),
        submitButton: submitButton.tagName + (submitButton.type ? `[type="${submitButton.type}"]` : '')
    });
    
    // Step 2: Fill form
    debugLog('test_action', 'Filling form fields');
    emailField.value = 'demo@barbershop.com';
    passwordField.value = 'demo123';
    
    // Trigger React events
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    emailField.dispatchEvent(new Event('change', { bubbles: true }));
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    
    debugLog('test_action', 'Form fields filled and events triggered');
    
    // Step 3: Wait a moment then submit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    debugLog('test_action', 'Clicking submit button', {
        buttonText: submitButton.textContent,
        buttonDisabled: submitButton.disabled,
        buttonClasses: submitButton.className
    });
    
    submitButton.click();
    
    // Step 4: Monitor for 10 seconds
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentButton = document.querySelector('button[type="submit"]');
        const currentUrl = window.location.href;
        const errorElements = document.querySelectorAll('[class*="error"], [class*="red"], .error');
        
        debugLog('test_monitor', `Status check ${i + 1}/10`, {
            url: currentUrl,
            buttonText: currentButton?.textContent,
            buttonDisabled: currentButton?.disabled,
            errorCount: errorElements.length,
            errors: Array.from(errorElements).map(el => el.textContent)
        });
        
        // If we're redirected to dashboard, success!
        if (currentUrl.includes('/dashboard')) {
            debugLog('test_success', 'Login successful - redirected to dashboard');
            break;
        }
        
        // If there are visible errors, note them
        if (errorElements.length > 0) {
            debugLog('test_error', 'Visible errors detected', {
                errors: Array.from(errorElements).map(el => el.textContent)
            });
        }
    }
    
    // Step 5: Generate comprehensive report
    setTimeout(() => {
        console.log('\n🔍 ================ COMPREHENSIVE DEBUG REPORT ================');
        console.log('🔍 Test Duration:', Date.now() - debugState.startTime, 'ms');
        console.log('🔍 Final URL:', window.location.href);
        console.log('🔍 Login Success:', window.location.href.includes('/dashboard'));
        
        console.log('\n🔍 ===== ALL LOGS =====');
        debugState.logs.forEach(log => {
            console.log(`[${log.timestamp}ms] ${log.type}: ${log.message}`, log.data || '');
        });
        
        console.log('\n🔍 ===== ALL ERRORS =====');
        debugState.errors.forEach(error => {
            console.log(`[${error.timestamp}ms] ${error.type}:`, error);
        });
        
        console.log('\n🔍 ===== CURRENT PAGE STATE =====');
        console.log('URL:', window.location.href);
        console.log('Title:', document.title);
        console.log('Cookies:', document.cookie);
        console.log('Local Storage:', Object.keys(localStorage).map(key => `${key}: ${localStorage.getItem(key)}`));
        
        const currentButton = document.querySelector('button[type="submit"]');
        if (currentButton) {
            console.log('Submit Button:', {
                text: currentButton.textContent,
                disabled: currentButton.disabled,
                classes: currentButton.className
            });
        }
        
        const errorElements = document.querySelectorAll('[class*="error"], [class*="red"], .error');
        if (errorElements.length > 0) {
            console.log('Visible Errors:', Array.from(errorElements).map(el => el.textContent));
        }
        
        console.log('🔍 ================ END DEBUG REPORT ================\n');
        
        // Provide diagnosis
        if (window.location.href.includes('/dashboard')) {
            console.log('✅ DIAGNOSIS: Login is working correctly!');
        } else if (debugState.errors.length > 0) {
            console.log('❌ DIAGNOSIS: JavaScript errors are preventing login');
            console.log('Main errors:', debugState.errors.map(e => e.message || e.reason));
        } else if (debugState.logs.some(log => log.message.includes('network') || log.message.includes('fetch'))) {
            console.log('❌ DIAGNOSIS: Network/API issues preventing login');
        } else {
            console.log('❓ DIAGNOSIS: Login form may be stuck in loading state or not submitting properly');
        }
    }, 11000);
};

// 7. Auto-start the test if we're on the login page
if (window.location.pathname.includes('/login')) {
    debugLog('init', 'Auto-starting login test in 3 seconds...');
    setTimeout(() => {
        window.performLoginTest();
    }, 3000);
} else {
    debugLog('init', 'Not on login page, call performLoginTest() manually');
}

debugLog('init', 'Debug script loaded successfully');
console.log('🔍 Debug script ready! The test will auto-start in 3 seconds, or call performLoginTest() manually.');