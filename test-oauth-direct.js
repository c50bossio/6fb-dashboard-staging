// Direct test of OAuth without PKCE to see if basic OAuth works
const fetch = require('node-fetch');

async function testDirectOAuth() {
  const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
  
  // Test if Google OAuth is configured
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=http://localhost:9999/dashboard`;
  
  console.log('Testing direct OAuth URL (without PKCE):');
  console.log(authUrl);
  console.log('\nTry opening this URL in your browser:');
  console.log(authUrl);
  
  // Check if we can reach the OAuth endpoint
  try {
    const response = await fetch(authUrl, {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('\nOAuth endpoint response:');
    console.log('Status:', response.status);
    console.log('Location:', response.headers.get('location'));
    
    if (response.status === 302 || response.status === 307) {
      const googleUrl = response.headers.get('location');
      if (googleUrl && googleUrl.includes('accounts.google.com')) {
        console.log('\n✅ OAuth is properly configured!');
        console.log('Google OAuth URL starts with:', googleUrl.substring(0, 100) + '...');
      }
    }
  } catch (error) {
    console.error('Error testing OAuth:', error);
  }
}

testDirectOAuth();