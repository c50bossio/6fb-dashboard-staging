
console.log('🔍 Login Debug Script Started');

// 1. Monitor all console logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let debugLogs = [];

console.log = function(...args) {
    debugLogs.push({type: 'log', timestamp: new Date().toISOString(), args});
    originalLog.apply(console, ['🔍 LOG:', ...args]);
};

console.error = function(...args) {
    debugLogs.push({type: 'error', timestamp: new Date().toISOString(), args});
    originalError.apply(console, ['🚨 ERROR:', ...args]);
};

console.warn = function(...args) {
    debugLogs.push({type: 'warn', timestamp: new Date().toISOString(), args});
    originalWarn.apply(console, ['⚠️ WARN:', ...args]);
};

// 2. Monitor network requests
const originalFetch = window.fetch;
let networkLogs = [];

window.fetch = async function(...args) {
    const [url, options] = args;
    const startTime = Date.now();
    
    console.log('🌐 FETCH REQUEST:', url, options);
    networkLogs.push({
        type: 'request',
        url,
        options,
        timestamp: new Date().toISOString(),
        startTime
    });
    
    try {
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();
        const responseClone = response.clone();
        
        console.log('🌐 FETCH RESPONSE:', url, response.status, response.statusText, `${endTime - startTime}ms`);
        networkLogs.push({
            type: 'response',
            url,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString(),
            duration: endTime - startTime
        });
        
        if (url.includes('/api/') || url.includes('supabase')) {
            try {
                const responseText = await responseClone.text();
                console.log('🌐 RESPONSE BODY:', url, responseText);
                networkLogs[networkLogs.length - 1].body = responseText;
            } catch (e) {
                console.log('🌐 Could not read response body for:', url);
            }
        }
        
        return response;
    } catch (error) {
        const endTime = Date.now();
        console.error('🌐 FETCH ERROR:', url, error, `${endTime - startTime}ms`);
        networkLogs.push({
            type: 'error',
            url,
            error: error.message,
            timestamp: new Date().toISOString(),
            duration: endTime - startTime
        });
        throw error;
    }
};

// 3. Monitor JavaScript errors
window.addEventListener('error', (event) => {
    console.error('🚨 JAVASCRIPT ERROR:', event.error, event.filename, event.lineno, event.colno);
    debugLogs.push({
        type: 'javascript_error',
        timestamp: new Date().toISOString(),
        error: event.error.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error.stack
    });
});

// 4. Monitor unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
    debugLogs.push({
        type: 'unhandled_rejection',
        timestamp: new Date().toISOString(),
        reason: event.reason
    });
});

// 5. Monitor DOM mutations for loading states
let loadingStateChanges = [];
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const element = mutation.target;
            if (element.className && (element.className.includes('loading') || element.className.includes('disabled'))) {
                console.log('🔄 LOADING STATE CHANGE:', element.tagName, element.className);
                loadingStateChanges.push({
                    timestamp: new Date().toISOString(),
                    element: element.tagName + '.' + element.className,
                    type: 'loading_state_change'
                });
            }
        }
        
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.textContent && node.textContent.includes('error')) {
                    console.log('🚨 ERROR MESSAGE ADDED:', node.textContent);
                    debugLogs.push({
                        type: 'error_message',
                        timestamp: new Date().toISOString(),
                        message: node.textContent
                    });
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

// 6. Helper function to test login programmatically
window.debugLogin = async function(email = 'demo@barbershop.com', password = 'demo123') {
    console.log('🔍 Starting programmatic login test...');
    
    debugLogs = [];
    networkLogs = [];
    loadingStateChanges = [];
    
    const emailField = document.querySelector('input[type="email"], input[name="email"]');
    const passwordField = document.querySelector('input[type="password"], input[name="password"]');
    const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
    
    if (!emailField || !passwordField || !submitButton) {
        console.error('🚨 Could not find form elements:', {
            emailField: !!emailField,
            passwordField: !!passwordField,
            submitButton: !!submitButton
        });
        return;
    }
    
    console.log('📝 Filling form fields...');
    emailField.value = email;
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    emailField.dispatchEvent(new Event('change', { bubbles: true }));
    
    passwordField.value = password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('🚀 Clicking submit button...');
    submitButton.click();
    
    setTimeout(() => {
        console.log('===== CONSOLE LOGS =====');
        debugLogs.forEach(log => console.log(log));
        
        console.log('===== NETWORK REQUESTS =====');
        networkLogs.forEach(log => console.log(log));
        
        console.log('===== LOADING STATE CHANGES =====');
        loadingStateChanges.forEach(log => console.log(log));
        
        console.log('===== CURRENT PAGE STATE =====');
        console.log('URL:', window.location.href);
        console.log('Title:', document.title);
        console.log('User state in local storage:', localStorage.getItem('auth'));
        console.log('Cookies:', document.cookie);
        
        const errorElements = document.querySelectorAll('.error, .text-red-500, .text-red-600, [class*="error"]');
        if (errorElements.length > 0) {
            console.log('===== VISIBLE ERRORS =====');
            errorElements.forEach(el => console.log(el.textContent));
        }
        
        const currentButton = document.querySelector('button[type="submit"]');
        if (currentButton) {
            console.log('===== SUBMIT BUTTON STATE =====');
            console.log('Disabled:', currentButton.disabled);
            console.log('Text:', currentButton.textContent);
            console.log('Classes:', currentButton.className);
        }
        
    }, 10000);
};

// 7. Auto-start the login test
console.log('🔍 Debug script loaded. Auto-starting login test in 2 seconds...');

setTimeout(() => {
    if (window.location.pathname.includes('/login')) {
        debugLogin();
    } else {
        console.log('🔍 Not on login page, skipping auto-test');
    }
}, 2000);