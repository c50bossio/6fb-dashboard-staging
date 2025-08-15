#!/usr/bin/env node

/**
 * Stripe Subscription Cancellation Utility
 * Cancel active subscriptions created during testing
 */

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listActiveSubscriptions(email = null) {
  console.log('📋 Fetching active subscriptions...\n');
  
  try {
    let customerId = null;
    if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 10
      });
      
      if (customers.data.length === 0) {
        console.log(`No customers found with email: ${email}`);
        return [];
      }
      
      console.log(`Found ${customers.data.length} customer(s) with email ${email}\n`);
      
      let allSubscriptions = [];
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 100
        });
        allSubscriptions = allSubscriptions.concat(subscriptions.data);
      }
      
      return allSubscriptions;
    } else {
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 20
      });
      
      return subscriptions.data;
    }
  } catch (error) {
    console.error('❌ Error fetching subscriptions:', error.message);
    return [];
  }
}

async function displaySubscriptions(subscriptions) {
  if (subscriptions.length === 0) {
    console.log('No active subscriptions found.');
    return;
  }
  
  console.log('Active subscriptions:');
  console.log('================================================================================');
  
  for (const [index, sub] of subscriptions.entries()) {
    const customer = await stripe.customers.retrieve(sub.customer);
    const amount = sub.items.data[0]?.price?.unit_amount || 0;
    const interval = sub.items.data[0]?.price?.recurring?.interval || 'unknown';
    const created = new Date(sub.created * 1000).toLocaleString();
    
    console.log(`${index + 1}. ${sub.id}`);
    console.log(`   Customer: ${customer.email || 'N/A'} (${customer.id})`);
    console.log(`   Amount: $${(amount / 100).toFixed(2)} / ${interval}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${created}`);
    console.log(`   Current Period: ${new Date(sub.current_period_start * 1000).toLocaleDateString()} - ${new Date(sub.current_period_end * 1000).toLocaleDateString()}`);
    console.log('--------------------------------------------------------------------------------');
  }
}

async function cancelSubscription(subscriptionId, immediately = false) {
  console.log(`\n🔄 Canceling subscription: ${subscriptionId}`);
  
  try {
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscriptionId,
      {
        invoice_now: false,
        prorate: false
      }
    );
    
    console.log('✅ Subscription canceled successfully!');
    console.log(`   Status: ${canceledSubscription.status}`);
    console.log(`   Canceled At: ${new Date(canceledSubscription.canceled_at * 1000).toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Cancellation failed:', error.message);
    return false;
  }
}

async function cancelAllForEmail(email) {
  console.log(`\n🔍 Searching for all subscriptions for: ${email}\n`);
  
  const subscriptions = await listActiveSubscriptions(email);
  
  if (subscriptions.length === 0) {
    console.log('No active subscriptions found for this email.');
    return;
  }
  
  await displaySubscriptions(subscriptions);
  
  console.log(`\n🚨 Canceling ${subscriptions.length} subscription(s)...\n`);
  
  let canceledCount = 0;
  for (const sub of subscriptions) {
    const success = await cancelSubscription(sub.id);
    if (success) canceledCount++;
  }
  
  console.log(`\n✅ Canceled ${canceledCount} out of ${subscriptions.length} subscription(s)`);
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🏦 Stripe Subscription Cancellation Utility');
  console.log('===========================================\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }
  
  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  console.log(`Mode: ${isLiveMode ? '⚠️  LIVE MODE (Real Subscriptions)' : '✅ TEST MODE'}\n`);
  
  if (args.length === 0) {
    const subscriptions = await listActiveSubscriptions();
    await displaySubscriptions(subscriptions);
    
    console.log('\nUsage:');
    console.log('  node scripts/stripe-cancel-subscriptions.js <subscription_id>   # Cancel specific subscription');
    console.log('  node scripts/stripe-cancel-subscriptions.js --email <email>     # Cancel all for email');
    console.log('  node scripts/stripe-cancel-subscriptions.js --all               # Cancel ALL active subscriptions');
  } else if (args[0] === '--email' && args[1]) {
    await cancelAllForEmail(args[1]);
  } else if (args[0] === '--all') {
    console.log('⚠️  WARNING: This will cancel ALL active subscriptions!');
    const subscriptions = await listActiveSubscriptions();
    await displaySubscriptions(subscriptions);
    
    if (subscriptions.length > 0) {
      console.log('\n🚨 Canceling ALL subscriptions...\n');
      let canceledCount = 0;
      for (const sub of subscriptions) {
        const success = await cancelSubscription(sub.id);
        if (success) canceledCount++;
      }
      console.log(`\n✅ Canceled ${canceledCount} out of ${subscriptions.length} subscription(s)`);
    }
  } else if (args[0].startsWith('sub_')) {
    await cancelSubscription(args[0]);
  } else {
    console.log('Invalid arguments.');
    console.log('\nUsage:');
    console.log('  node scripts/stripe-cancel-subscriptions.js                     # List active subscriptions');
    console.log('  node scripts/stripe-cancel-subscriptions.js <subscription_id>   # Cancel specific subscription');
    console.log('  node scripts/stripe-cancel-subscriptions.js --email <email>     # Cancel all for email');
    console.log('  node scripts/stripe-cancel-subscriptions.js --all               # Cancel ALL active subscriptions');
  }
}

main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});