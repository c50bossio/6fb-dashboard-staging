#!/usr/bin/env node

/**
 * Webhook Configuration Verification Script
 * 
 * This script helps verify your Stripe webhook is configured correctly
 * Run after setting up webhook in Stripe Dashboard
 */

const Stripe = require('stripe');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function verifyWebhookConfig() {
  console.log('🔍 Verifying Stripe webhook configuration...\n');

  try {
    // List webhook endpoints
    console.log('📋 Current webhook endpoints:');
    const webhooks = await stripe.webhookEndpoints.list({
      limit: 10
    });

    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoints configured');
      console.log('\n📝 Action Required:');
      console.log('1. Go to: https://dashboard.stripe.com/webhooks');
      console.log('2. Click "Add endpoint"');
      console.log('3. URL: https://bookbarber.com/api/stripe/webhook');
      console.log('4. Select events: checkout.session.completed, customer.subscription.*, invoice.payment_*');
      return;
    }

    webhooks.data.forEach((webhook, index) => {
      console.log(`\n${index + 1}. Webhook ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events: ${webhook.enabled_events.length} events`);
      console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
      
      // Check if it's the bookbarber webhook
      if (webhook.url.includes('bookbarber.com') || webhook.url.includes('localhost')) {
        console.log(`   ✅ BookedBarber webhook found!`);
        
        // Check required events
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
          console.log(`   ⚠️  Missing events: ${missingEvents.join(', ')}`);
        } else {
          console.log(`   ✅ All required events configured`);
        }
      }
    });

    // Check environment variables
    console.log('\n🔧 Environment Variable Check:');
    console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'}`);
    
    // Check product price IDs
    console.log('\n💰 Product Price IDs:');
    console.log(`STRIPE_BARBER_PRICE_ID: ${process.env.STRIPE_BARBER_PRICE_ID || '❌ Missing'}`);
    console.log(`STRIPE_SHOP_PRICE_ID: ${process.env.STRIPE_SHOP_PRICE_ID || '❌ Missing'}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID: ${process.env.STRIPE_ENTERPRISE_PRICE_ID || '❌ Missing'}`);

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.log('\n⚠️  WEBHOOK SECRET MISSING:');
      console.log('1. Go to: https://dashboard.stripe.com/webhooks');
      console.log('2. Click on your bookbarber.com webhook');
      console.log('3. In the "Signing secret" section, click "Reveal"');
      console.log('4. Copy the secret (starts with whsec_)');
      console.log('5. Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...');
    }

    console.log('\n🎉 Webhook verification complete!');

  } catch (error) {
    console.error('❌ Error verifying webhook configuration:', error.message);
  }
}

verifyWebhookConfig();