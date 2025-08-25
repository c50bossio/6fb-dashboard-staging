#!/usr/bin/env node

/**
 * Test script to verify Stripe mode on production
 * This simulates what the payment setup page checks
 */

const https = require('https');

function checkProductionStripeMode() {
  console.log('🔍 Checking Stripe mode on production...\n');

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
        
        console.log('📊 Production Stripe Configuration:');
        console.log('====================================');
        
        if (response.checks && response.checks.stripe) {
          const stripe = response.checks.stripe;
          
          // Check mode
          if (stripe.mode === 'live') {
            console.log('✅ Mode: LIVE (production ready)');
          } else if (stripe.mode === 'test') {
            console.log('⚠️  Mode: TEST (not for real transactions)');
          } else {
            console.log('❓ Mode: Unknown');
          }
          
          // Check configuration
          if (stripe.configured) {
            console.log('✅ Configuration: Complete');
          } else {
            console.log('❌ Configuration: Incomplete or missing');
          }
          
          // Check Connect readiness
          if (stripe.connectReady) {
            console.log('✅ Stripe Connect: Ready');
          } else {
            console.log('❌ Stripe Connect: Not ready');
          }
          
          // Analyze the situation
          console.log('\n📋 Analysis:');
          console.log('============');
          
          if (stripe.mode === 'live' && !stripe.configured) {
            console.log('🔍 Live mode is detected but configuration is incomplete.');
            console.log('   This suggests:');
            console.log('   1. Live keys might be set in environment variables');
            console.log('   2. But either the keys are invalid or missing');
            console.log('   3. Or there\'s an issue with how they\'re being loaded');
            console.log('\n   Possible causes:');
            console.log('   - STRIPE_SECRET_KEY is not set or invalid');
            console.log('   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
            console.log('   - Keys are set but don\'t match (one live, one test)');
            console.log('   - Environment variables not properly loaded in production');
          } else if (stripe.mode === 'test' && stripe.configured) {
            console.log('⚠️  Test mode is active and configured.');
            console.log('   This is NOT suitable for real barbershop transactions.');
            console.log('   You need to switch to live keys in Vercel.');
          } else if (stripe.mode === 'live' && stripe.configured) {
            console.log('🎉 Perfect! Live mode is active and properly configured.');
            console.log('   Ready for real barbershop transactions.');
          }
        }
        
        // Check pricing configuration
        if (response.checks && response.checks.pricing) {
          console.log('\n💰 Payment Processing Fees:');
          console.log('==========================');
          console.log(`Card payments: ${response.checks.pricing.cardFee}`);
          console.log(`ACH payments: ${response.checks.pricing.achFee}`);
          console.log(`Platform markup: ${response.checks.pricing.platformMarkup}`);
          console.log(`Strategy: ${response.checks.pricing.strategy}`);
        }
        
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  }).on('error', (error) => {
    console.error('❌ Error connecting to production:', error.message);
  });
}

// Also check if we can detect the mode from the frontend
function checkFrontendIndicators() {
  console.log('\n🌐 Checking frontend indicators...\n');

  https.get('https://bookedbarber.com', (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      // Check for test mode indicators in the HTML
      const hasTestWarning = data.includes('test mode') || 
                            data.includes('Test Mode') ||
                            data.includes('pk_test_');
      
      const hasLiveIndicator = data.includes('pk_live_') ||
                              data.includes('Live payments active');
      
      if (hasTestWarning) {
        console.log('⚠️  Frontend shows TEST mode indicators');
      } else if (hasLiveIndicator) {
        console.log('✅ Frontend shows LIVE mode indicators');
      } else {
        console.log('📝 No explicit mode indicators found in frontend HTML');
        console.log('   (This is normal - keys are loaded dynamically)');
      }
    });
  }).on('error', (error) => {
    console.error('❌ Error fetching frontend:', error.message);
  });
}

// Run both checks
checkProductionStripeMode();
setTimeout(checkFrontendIndicators, 1000);