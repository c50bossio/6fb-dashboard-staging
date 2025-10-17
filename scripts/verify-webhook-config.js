#!/usr/bin/env node

/**
 * Webhook Configuration Verification Script
 * 
 * This script helps verify your Stripe webhook is configured correctly
 * Run after setting up webhook in Stripe Dashboard
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

async function verifyWebhookConfig() {

  try {
    
    const webhooks = await stripe.webhookEndpoints.list({
      limit: 10
    });

    if (webhooks.data.length === 0) {

      return;
    }

    webhooks.data.forEach((webhook, index) => {

      }`);
      
      if (webhook.url.includes('bookbarber.com') || webhook.url.includes('localhost')) {

        const requiredEvents = [
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated', 
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ];
        
        const missingEvents = requiredEvents.filter(event => 
          !webhook.enabled_events.includes(event)
        );
        
        if (missingEvents.length > 0) {
          }`);
        } else {
          
        }
      }
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {

      ');
      
    }

  } catch (error) {
    console.error('❌ Error verifying webhook configuration:', error.message);
  }
}

verifyWebhookConfig();