#!/usr/bin/env node

/**
 * Monitor Stripe configuration deployment
 * Checks every 30 seconds until configuration is complete
 */

const https = require('https');

let checkCount = 0;
const maxChecks = 10; // Check for up to 5 minutes

function checkConfiguration() {
  checkCount++;
  
  const options = {
    hostname: 'bookedbarber.com',
    path: '/api/payments/health',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };

  https.get(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const stripe = response.checks?.stripe || {};
        
        console.log(`\n[Check #${checkCount}] ${new Date().toLocaleTimeString()}`);
        console.log('=====================================');
        console.log(`Mode: ${stripe.mode || 'unknown'}`);
        console.log(`Configured: ${stripe.configured ? '✅ YES' : '❌ NO'}`);
        console.log(`Connect Ready: ${stripe.connectReady ? '✅ YES' : '❌ NO'}`);
        
        if (stripe.configured && stripe.connectReady && stripe.mode === 'live') {
          console.log('\n🎉 SUCCESS! Stripe is fully configured in LIVE mode!');
          console.log('Payment setup should now work on production.');
          console.log('\nYou can now test at:');
          console.log('https://bookedbarber.com/shop/settings/payment-setup');
          process.exit(0);
        } else if (checkCount >= maxChecks) {
          console.log('\n⏱️  Timeout reached. Current status:');
          console.log(JSON.stringify(stripe, null, 2));
          console.log('\nThe deployment might still be in progress.');
          console.log('Check https://vercel.com/dashboard for deployment status.');
          process.exit(1);
        } else {
          console.log(`\nWaiting 30 seconds before next check... (${maxChecks - checkCount} checks remaining)`);
          setTimeout(checkConfiguration, 30000);
        }
      } catch (error) {
        console.error('Error parsing response:', error.message);
        if (checkCount < maxChecks) {
          setTimeout(checkConfiguration, 30000);
        }
      }
    });
  }).on('error', (error) => {
    console.error('Error connecting:', error.message);
    if (checkCount < maxChecks) {
      setTimeout(checkConfiguration, 30000);
    }
  });
}

console.log('🔄 Monitoring Stripe configuration deployment...');
console.log('This will check every 30 seconds for up to 5 minutes.');
checkConfiguration();