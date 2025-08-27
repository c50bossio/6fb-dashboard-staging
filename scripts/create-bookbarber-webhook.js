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

  try {
    const existingWebhooks = await stripe.webhookEndpoints.list({
      limit: 100
    });

    const bookbarberWebhook = existingWebhooks.data.find(webhook => 
      webhook.url === 'https://bookbarber.com/api/stripe/webhook'
    );

    if (bookbarberWebhook) {

      return;
    }

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

    }`);

    ');

  } catch (error) {
    console.error('❌ Error creating webhook endpoint:', error.message);
    
    if (error.code === 'url_invalid') {

    }
    
    process.exit(1);
  }
}

createBookBarberWebhook();