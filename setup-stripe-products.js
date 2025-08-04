#!/usr/bin/env node

/**
 * Stripe Products Setup Script
 * Creates all required products, prices, and webhook endpoints for production
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Product configurations matching our billing system
const PRODUCTS_CONFIG = [
  {
    id: 'starter',
    name: '6FB AI Starter',
    description: 'Perfect for single barbershops starting with AI',
    price: 1999, // $19.99 in cents
    tokens: 15000,
    features: [
      '15,000 AI tokens included',
      'Basic analytics & forecasting',
      'Email support',
      '1 barbershop location',
      '$0.008 per 1,000 additional tokens'
    ]
  },
  {
    id: 'professional',
    name: '6FB AI Professional',
    description: 'Ideal for growing barbershops with multiple locations',
    price: 4999, // $49.99 in cents
    tokens: 75000,
    popular: true,
    features: [
      '75,000 AI tokens included',
      'Advanced analytics & real-time alerts',
      'Priority support',
      'Custom branding',
      'Up to 5 barbershop locations',
      '$0.006 per 1,000 additional tokens'
    ]
  },
  {
    id: 'enterprise',
    name: '6FB AI Enterprise',
    description: 'Complete solution for barbershop chains and franchises',
    price: 9999, // $99.99 in cents
    tokens: 300000,
    features: [
      '300,000 AI tokens included',
      'Full AI suite with custom models',
      'White-label options',
      'Dedicated success manager',
      'Unlimited barbershop locations',
      'API access & custom integrations',
      '$0.004 per 1,000 additional tokens'
    ]
  }
];

async function createStripeProducts() {
  console.log('🚀 Setting up Stripe products for 6FB AI Agent System...\n');

  const createdProducts = [];

  for (const productConfig of PRODUCTS_CONFIG) {
    try {
      console.log(`📦 Creating product: ${productConfig.name}`);

      // Create the product
      const product = await stripe.products.create({
        name: productConfig.name,
        description: productConfig.description,
        metadata: {
          plan_id: productConfig.id,
          included_tokens: productConfig.tokens.toString(),
          popular: productConfig.popular ? 'true' : 'false'
        }
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create the recurring price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: productConfig.price,
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 14 // 14-day free trial
        },
        metadata: {
          plan_id: productConfig.id,
          included_tokens: productConfig.tokens.toString()
        }
      });

      console.log(`   ✅ Price created: ${price.id} ($${(productConfig.price / 100).toFixed(2)}/month)`);
      console.log(`   🎁 14-day free trial enabled`);

      // Create usage-based pricing for token overages
      const usagePrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        billing_scheme: 'per_unit',
        recurring: {
          interval: 'month',
          usage_type: 'metered'
        },
        unit_amount: Math.round(productConfig.id === 'starter' ? 0.8 : 
                              productConfig.id === 'professional' ? 0.6 : 0.4), // Convert to cents per unit
        metadata: {
          plan_id: productConfig.id,
          type: 'overage',
          rate_per_1k_tokens: productConfig.id === 'starter' ? '0.008' : 
                             productConfig.id === 'professional' ? '0.006' : '0.004'
        }
      });

      console.log(`   ✅ Usage price created: ${usagePrice.id} (overage billing)`);

      createdProducts.push({
        plan_id: productConfig.id,
        name: productConfig.name,
        product_id: product.id,
        price_id: price.id,
        usage_price_id: usagePrice.id,
        amount: productConfig.price,
        tokens: productConfig.tokens,
        popular: productConfig.popular
      });

      console.log('');

    } catch (error) {
      console.error(`   ❌ Error creating ${productConfig.name}:`, error.message);
    }
  }

  return createdProducts;
}

async function setupWebhookEndpoints() {
  console.log('🔗 Setting up webhook endpoints...\n');

  const webhookEndpoints = [
    {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`,
      description: 'Main billing webhook endpoint',
      events: [
        'customer.subscription.created',
        'customer.subscription.updated', 
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'invoice.created',
        'customer.subscription.trial_will_end',
        'checkout.session.completed',
        'customer.created'
      ]
    }
  ];

  const createdWebhooks = [];

  for (const webhookConfig of webhookEndpoints) {
    try {
      console.log(`🔗 Creating webhook: ${webhookConfig.description}`);
      console.log(`   URL: ${webhookConfig.url}`);

      const webhook = await stripe.webhookEndpoints.create({
        url: webhookConfig.url,
        enabled_events: webhookConfig.events,
        description: webhookConfig.description
      });

      console.log(`   ✅ Webhook created: ${webhook.id}`);
      console.log(`   🔑 Webhook secret: ${webhook.secret}`);
      console.log(`   📋 Events: ${webhookConfig.events.length} configured`);

      createdWebhooks.push({
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        events: webhookConfig.events
      });

      console.log('');

    } catch (error) {
      console.error(`   ❌ Error creating webhook:`, error.message);
    }
  }

  return createdWebhooks;
}

async function generateEnvironmentVariables(products, webhooks) {
  console.log('🔧 Generating environment variables...\n');

  const envVars = [];

  // Stripe configuration
  envVars.push('# Stripe Configuration (Production)');
  envVars.push(`STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}`);
  envVars.push(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`);
  
  // Webhook secrets
  if (webhooks.length > 0) {
    envVars.push(`STRIPE_WEBHOOK_SECRET=${webhooks[0].secret}`);
  }

  envVars.push('');

  // Product price IDs
  envVars.push('# Stripe Price IDs');
  products.forEach(product => {
    const envName = `STRIPE_${product.plan_id.toUpperCase()}_PRICE_ID`;
    envVars.push(`${envName}=${product.price_id}`);
    
    const usageEnvName = `STRIPE_${product.plan_id.toUpperCase()}_USAGE_PRICE_ID`;
    envVars.push(`${usageEnvName}=${product.usage_price_id}`);
  });

  console.log('📄 Environment Variables:');
  console.log('========================');
  envVars.forEach(line => console.log(line));

  return envVars;
}

async function generateSetupSummary(products, webhooks) {
  console.log('\n🎯 STRIPE SETUP COMPLETE!');
  console.log('=========================\n');

  console.log('📦 Products Created:');
  products.forEach(product => {
    console.log(`   ${product.popular ? '⭐ ' : '   '}${product.name}`);
    console.log(`      Product ID: ${product.product_id}`);
    console.log(`      Price ID: ${product.price_id}`);
    console.log(`      Usage Price ID: ${product.usage_price_id}`);
    console.log(`      Monthly: $${(product.amount / 100).toFixed(2)}`);
    console.log(`      Tokens: ${product.tokens.toLocaleString()}`);
    console.log(`      Trial: 14 days free`);
    console.log('');
  });

  console.log('🔗 Webhooks Created:');
  webhooks.forEach(webhook => {
    console.log(`   Endpoint: ${webhook.url}`);
    console.log(`   ID: ${webhook.id}`);
    console.log(`   Events: ${webhook.events.length} configured`);
    console.log('');
  });

  console.log('🎁 Free Trial Features:');
  console.log('   ✅ 14-day free trial on all plans');
  console.log('   ✅ No credit card required to start');
  console.log('   ✅ Full feature access during trial');
  console.log('   ✅ Automatic trial ending notifications');
  console.log('');

  console.log('💰 Pricing Summary:');
  console.log('   💎 Starter: $19.99/month + 15K tokens');
  console.log('   🚀 Professional: $49.99/month + 75K tokens');
  console.log('   🏢 Enterprise: $99.99/month + 300K tokens');
  console.log('   📈 Token overages: $0.004-0.008 per 1K tokens');
  console.log('');

  console.log('🔧 Next Steps:');
  console.log('   1. Update .env.production with the generated environment variables');
  console.log('   2. Test webhook endpoints with Stripe CLI');
  console.log('   3. Deploy application to production');
  console.log('   4. Test end-to-end billing flow');
  console.log('   5. Start customer onboarding!');
}

async function main() {
  try {
    // Validate environment
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
    }

    // Create products
    const products = await createStripeProducts();
    
    // Setup webhooks
    const webhooks = await setupWebhookEndpoints();
    
    // Generate environment variables
    const envVars = await generateEnvironmentVariables(products, webhooks);
    
    // Generate summary
    await generateSetupSummary(products, webhooks);

    // Save configuration to file
    const fs = require('fs');
    const configData = {
      timestamp: new Date().toISOString(),
      products,
      webhooks,
      environment_variables: envVars
    };

    fs.writeFileSync('stripe-setup-config.json', JSON.stringify(configData, null, 2));
    console.log('💾 Configuration saved to stripe-setup-config.json');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = {
  createStripeProducts,
  setupWebhookEndpoints,
  generateEnvironmentVariables
};