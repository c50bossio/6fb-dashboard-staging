#!/usr/bin/env node

/**
 * Create BookedBarber Webhook Endpoint
 * 
 * This script creates a new webhook endpoint specifically for bookbarber.com
 */

const Stripe = require('stripe');

require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function createBookBarberWebhook() {
  console.log('🔗 Creating BookedBarber webhook endpoint...\n');

  try {
    const existingWebhooks = await stripe.webhookEndpoints.list({
      limit: 100
    });

    const bookbarberWebhook = existingWebhooks.data.find(webhook => 
      webhook.url === 'https://bookbarber.com/api/stripe/webhook'
    );

    if (bookbarberWebhook) {
      console.log('✅ BookedBarber webhook already exists!');
      console.log(`   Webhook ID: ${bookbarberWebhook.id}`);
      console.log(`   URL: ${bookbarberWebhook.url}`);
      console.log(`   Status: ${bookbarberWebhook.status}`);
      console.log(`   Events: ${bookbarberWebhook.enabled_events.length} events`);
      console.log('\n📋 Webhook signing secret:');
      console.log('Go to: https://dashboard.stripe.com/webhooks');
      console.log('Click on your bookbarber.com webhook');
      console.log('Copy the signing secret and add it to .env.local');
      return;
    }

    console.log('Creating new webhook endpoint for bookbarber.com...');
    
    const webhook = await stripe.webhookEndpoints.create({
      url: 'https://bookbarber.com/api/stripe/webhook',
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated', 
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'customer.subscription.trial_will_end'
      ],
      description: 'BookedBarber Subscription Webhooks',
      api_version: '2023-10-16',
      connect: false
    });

    console.log('✅ Webhook endpoint created successfully!');
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Status: ${webhook.status}`);
    console.log(`   Events: ${webhook.enabled_events.length} events`);
    console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
    
    console.log('\n🔑 WEBHOOK SIGNING SECRET:');
    console.log('========================================');
    console.log('IMPORTANT: Go to Stripe Dashboard to get your signing secret!');
    console.log('');
    console.log('1. Go to: https://dashboard.stripe.com/webhooks');
    console.log(`2. Click on webhook: ${webhook.id}`);
    console.log('3. In the "Signing secret" section, click "Reveal"');
    console.log('4. Copy the secret (starts with whsec_)');
    console.log('5. Update your .env.local file:');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here');
    console.log('');
    console.log('🚀 After updating the webhook secret, your paywall will be ready!');

  } catch (error) {
    console.error('❌ Error creating webhook endpoint:', error.message);
    
    if (error.code === 'url_invalid') {
      console.log('\n💡 URL Invalid Error:');
      console.log('The webhook URL might not be accessible yet.');
      console.log('Make sure bookbarber.com is deployed and the endpoint responds to POST requests.');
    }
    
    process.exit(1);
  }
}

createBookBarberWebhook();