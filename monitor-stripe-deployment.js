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
        
        .toLocaleTimeString()}`);

        if (stripe.configured && stripe.connectReady && stripe.mode === 'live') {

          process.exit(0);
        } else if (checkCount >= maxChecks) {
          
          );

          process.exit(1);
        } else {
          `);
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

checkConfiguration();