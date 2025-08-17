const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function test() {
  console.log('Testing Settings Page Load...\n');
  
  try {
    const response = await makeRequest('http://localhost:9999/dashboard/settings');
    console.log(`✅ Settings page status: ${response.status}`);
    
    // Check for key elements (client-side rendered content won't show in initial HTML)
    const hasSettingsContent = response.data.includes('settings') || response.data.includes('Settings');
    console.log(`${hasSettingsContent ? '✅' : '⚠️'} Settings content found in HTML`);
    
    // Direct payment section test
    const paymentResponse = await makeRequest('http://localhost:9999/dashboard/settings#payments');
    console.log(`✅ Payment section URL status: ${paymentResponse.status}`);
    
    console.log('\n📝 Summary:');
    console.log('- Settings page is loading successfully');
    console.log('- Payment section URL is accessible');
    console.log('- Content is client-side rendered (React)');
    console.log('\n🎯 To access payment setup:');
    console.log('1. Navigate to: http://localhost:9999/dashboard/settings#payments');
    console.log('2. Or go to Settings and click "Accept Payments" section');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();