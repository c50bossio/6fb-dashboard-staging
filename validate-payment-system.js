#!/usr/bin/env node

/**
 * Quick validation script for payment system readiness
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Payment System Validation');
console.log('============================\n');

// Check environment variables
const requiredEnvVars = {
  'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
  'STRIPE_CONNECT_CLIENT_ID': process.env.STRIPE_CONNECT_CLIENT_ID
};

console.log('📋 Environment Variables:');
let envComplete = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.includes('PLACEHOLDER')) {
    console.log(`  ❌ ${key}: Missing or placeholder`);
    envComplete = false;
  } else {
    const displayValue = value.substring(0, 10) + '...';
    const isTest = value.includes('test');
    const emoji = isTest ? '✅' : '⚠️';
    const mode = isTest ? '(TEST MODE)' : '(LIVE MODE - Switch to test for development!)';
    console.log(`  ${emoji} ${key}: ${displayValue} ${mode}`);
  }
}

// Check critical files
console.log('\n📁 Critical Files:');
const criticalFiles = [
  'services/stripe-service.js',
  'components/onboarding/FinancialSetupEnhanced.js',
  'app/api/payments/connect/create/route.js',
  'app/api/payments/connect/onboarding-link/route.js',
  'app/api/payments/connect/status/[accountId]/route.js',
  'app/api/webhooks/stripe/route.js',
  'database/migrations/004_payment_processing.sql',
  'run-payment-migration.sql'
];

for (const file of criticalFiles) {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
}

// Summary and next steps
console.log('\n📊 Summary:');
console.log('============');

if (!envComplete) {
  console.log('\n⚠️  ACTION REQUIRED:\n');
  
  if (!process.env.STRIPE_CONNECT_CLIENT_ID || process.env.STRIPE_CONNECT_CLIENT_ID.includes('PLACEHOLDER')) {
    console.log('1. Get your Stripe Connect Client ID:');
    console.log('   • Go to: https://dashboard.stripe.com/settings/connect');
    console.log('   • Copy the Client ID (starts with "ca_")');
    console.log('   • Update STRIPE_CONNECT_CLIENT_ID in .env.local\n');
  }
  
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('test')) {
    console.log('2. Switch to TEST keys for development:');
    console.log('   • Go to: https://dashboard.stripe.com/test/apikeys');
    console.log('   • Copy the test keys');
    console.log('   • Update all Stripe keys in .env.local\n');
  }
  
  console.log('3. Run database migration:');
  console.log('   • Go to Supabase SQL Editor');
  console.log('   • Copy contents of run-payment-migration.sql');
  console.log('   • Execute the SQL\n');
  
  console.log('4. Test the integration:');
  console.log('   • Start dev server: npm run dev');
  console.log('   • Navigate to /dashboard');
  console.log('   • Complete onboarding Step 5 (Payment Processing)');
} else {
  console.log('\n✅ Payment system is configured!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration in Supabase');
  console.log('2. Test the onboarding flow at /dashboard');
  console.log('3. Complete Step 5 (Payment Processing) to verify');
}

console.log('\n📚 Documentation:');
console.log('   • Setup Guide: STRIPE-CONNECT-SETUP.md');
console.log('   • Migration SQL: run-payment-migration.sql');
console.log('   • Test Script: test-payment-setup.js');

console.log('\n============================');
console.log('✨ Validation Complete\n');