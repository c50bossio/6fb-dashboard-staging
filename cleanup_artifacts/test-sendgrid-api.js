require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testSendGridAPI() {
    console.log('🔑 Testing SendGrid API Key Directly');
    console.log('=====================================\n');
    
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error('❌ No SendGrid API key found in environment');
        return;
    }
    
    // Mask API key for display
    const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    console.log('📋 API Key: ' + maskedKey);
    console.log('📧 From Email: ' + process.env.SENDGRID_FROM_EMAIL);
    console.log('👤 From Name: ' + process.env.SENDGRID_FROM_NAME + '\n');
    
    // Test 1: Verify API key format
    console.log('1️⃣ Checking API Key Format...');
    if (apiKey.startsWith('SG.')) {
        console.log('  ✅ API key has correct format\n');
    } else {
        console.log('  ⚠️ API key format looks unusual\n');
    }
    
    // Test 2: Direct API call to SendGrid
    console.log('2️⃣ Testing SendGrid API Authentication...');
    try {
        const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('  Response Status: ' + response.status);
        
        if (response.status === 200) {
            const profile = await response.json();
            console.log('  ✅ API Key is VALID!');
            console.log('  Account Type: ' + (profile.type || 'Standard'));
            console.log('  Email: ' + (profile.email || 'Not available') + '\n');
        } else if (response.status === 401) {
            console.log('  ❌ API Key is INVALID (401 Unauthorized)');
            console.log('  Please check your SendGrid API key\n');
            
            const errorBody = await response.text();
            console.log('  Error details:', errorBody);
        } else {
            console.log('  ⚠️ Unexpected response: ' + response.status);
            const body = await response.text();
            console.log('  Response:', body);
        }
    } catch (error) {
        console.log('  ❌ Network error:', error.message);
    }
    
    // Test 3: Try sending a test email
    console.log('\n3️⃣ Attempting to Send Test Email (Sandbox Mode)...');
    try {
        const testEmail = {
            personalizations: [{
                to: [{ email: 'test@example.com' }],
                subject: 'SendGrid API Test'
            }],
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'noreply@6fbmentorship.com',
                name: process.env.SENDGRID_FROM_NAME || '6FB AI Agent System'
            },
            content: [{
                type: 'text/plain',
                value: 'This is a test email to verify SendGrid API configuration.'
            }],
            mail_settings: {
                sandbox_mode: {
                    enable: true  // Use sandbox mode to prevent actual sending
                }
            }
        };
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testEmail)
        });
        
        console.log('  Response Status: ' + response.status);
        
        if (response.status === 202) {
            console.log('  ✅ Test email accepted (sandbox mode)');
            console.log('  SendGrid is configured correctly!');
        } else if (response.status === 401) {
            console.log('  ❌ Authentication failed - API key is invalid');
            const errorBody = await response.text();
            console.log('  Error details:', errorBody);
        } else if (response.status === 403) {
            console.log('  ❌ Forbidden - API key lacks mail.send permission');
        } else {
            console.log('  ⚠️ Unexpected response: ' + response.status);
            const body = await response.text();
            if (body) console.log('  Response:', body);
        }
    } catch (error) {
        console.log('  ❌ Error sending test email:', error.message);
    }
    
    console.log('\n=====================================');
    console.log('📊 SENDGRID API TEST SUMMARY');
    console.log('=====================================\n');
    
    console.log('🔧 Next Steps:');
    console.log('1. If authentication failed, check your API key in .env.local');
    console.log('2. Ensure the API key has "Full Access" permissions');
    console.log('3. Verify the from email is verified in SendGrid');
    console.log('\nTo generate a new API key:');
    console.log('→ Go to https://app.sendgrid.com/settings/api_keys');
    console.log('→ Click "Create API Key"');
    console.log('→ Choose "Full Access"');
    console.log('→ Copy the key and update SENDGRID_API_KEY in .env.local');
}

testSendGridAPI().catch(console.error);