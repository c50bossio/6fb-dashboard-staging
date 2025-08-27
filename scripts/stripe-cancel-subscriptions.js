#!/usr/bin/env node

/**
 * Stripe Subscription Cancellation Utility
 * Cancel active subscriptions created during testing
 */

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listActiveSubscriptions(email = null) {

  try {
    let customerId = null;
    if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 10
      });
      
      if (customers.data.length === 0) {
        
        return [];
      }
      
       with email ${email}\n`);
      
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
    
    return;
  }

  for (const [index, sub] of subscriptions.entries()) {
    const customer = await stripe.customers.retrieve(sub.customer);
    const amount = sub.items.data[0]?.price?.unit_amount || 0;
    const interval = sub.items.data[0]?.price?.recurring?.interval || 'unknown';
    const created = new Date(sub.created * 1000).toLocaleString();

    `);
    .toFixed(2)} / ${interval}`);

    .toLocaleDateString()} - ${new Date(sub.current_period_end * 1000).toLocaleDateString()}`);
    
  }
}

async function cancelSubscription(subscriptionId, immediately = false) {

  try {
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscriptionId,
      {
        invoice_now: false,
        prorate: false
      }
    );

    .toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Cancellation failed:', error.message);
    return false;
  }
}

async function cancelAllForEmail(email) {

  const subscriptions = await listActiveSubscriptions(email);
  
  if (subscriptions.length === 0) {
    
    return;
  }
  
  await displaySubscriptions(subscriptions);
  
  ...\n`);
  
  let canceledCount = 0;
  for (const sub of subscriptions) {
    const success = await cancelSubscription(sub.id);
    if (success) canceledCount++;
  }
  
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }
  
  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  ' : '✅ TEST MODE'}\n`);
  
  if (args.length === 0) {
    const subscriptions = await listActiveSubscriptions();
    await displaySubscriptions(subscriptions);

  } else if (args[0] === '--email' && args[1]) {
    await cancelAllForEmail(args[1]);
  } else if (args[0] === '--all') {
    
    const subscriptions = await listActiveSubscriptions();
    await displaySubscriptions(subscriptions);
    
    if (subscriptions.length > 0) {
      
      let canceledCount = 0;
      for (const sub of subscriptions) {
        const success = await cancelSubscription(sub.id);
        if (success) canceledCount++;
      }
      `);
    }
  } else if (args[0].startsWith('sub_')) {
    await cancelSubscription(args[0]);
  } else {

  }
}

main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});