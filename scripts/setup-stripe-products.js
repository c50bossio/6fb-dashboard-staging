#!/usr/bin/env node

/**
 * Stripe Product Setup Script for BookedBarber
 * Run this script to create all necessary products and prices in Stripe
 * 
 * Usage: 
 * 1. Set your STRIPE_SECRET_KEY environment variable
 * 2. Run: node scripts/setup-stripe-products.js
 */

const Stripe = require('stripe');

// Use test key for initial setup, replace with live key for production
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY_HERE', {
  apiVersion: '2023-10-16',
});

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products for BookedBarber...\n');

  try {
    // Create Individual Barber Product
    console.log('Creating Individual Barber product...');
    const barberProduct = await stripe.products.create({
      name: 'Individual Barber',
      description: 'Perfect for independent barbers and stylists',
      metadata: {
        tier: 'barber',
        features: JSON.stringify([
          'Personal booking page',
          '1 staff member',
          '500 SMS credits/month',
          '1,000 email credits/month',
          '5,000 AI tokens/month',
          'Basic analytics',
          'Standard support'
        ])
      }
    });

    // Create prices for Individual Barber
    const barberMonthly = await stripe.prices.create({
      product: barberProduct.id,
      unit_amount: 3500, // $35.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Individual Barber Monthly',
      metadata: {
        tier: 'barber',
        period: 'monthly'
      }
    });

    const barberYearly = await stripe.prices.create({
      product: barberProduct.id,
      unit_amount: 33600, // $336.00 (20% discount)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'Individual Barber Yearly',
      metadata: {
        tier: 'barber',
        period: 'yearly'
      }
    });

    console.log('✅ Individual Barber product created');
    console.log(`   Monthly Price ID: ${barberMonthly.id}`);
    console.log(`   Yearly Price ID: ${barberYearly.id}\n`);

    // Create Barbershop Product
    console.log('Creating Barbershop product...');
    const shopProduct = await stripe.products.create({
      name: 'Barbershop',
      description: 'Ideal for barbershop owners with multiple barbers',
      metadata: {
        tier: 'shop',
        features: JSON.stringify([
          'Custom shop domain',
          'Up to 15 barbers',
          '2,000 SMS credits/month',
          '5,000 email credits/month',
          '20,000 AI tokens/month',
          'Advanced analytics',
          'Priority support',
          'Team management',
          'Inventory tracking'
        ])
      }
    });

    // Create prices for Barbershop
    const shopMonthly = await stripe.prices.create({
      product: shopProduct.id,
      unit_amount: 9900, // $99.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Barbershop Monthly',
      metadata: {
        tier: 'shop',
        period: 'monthly'
      }
    });

    const shopYearly = await stripe.prices.create({
      product: shopProduct.id,
      unit_amount: 95040, // $950.40 (20% discount)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'Barbershop Yearly',
      metadata: {
        tier: 'shop',
        period: 'yearly'
      }
    });

    console.log('✅ Barbershop product created');
    console.log(`   Monthly Price ID: ${shopMonthly.id}`);
    console.log(`   Yearly Price ID: ${shopYearly.id}\n`);

    // Create Multi-Location Enterprise Product
    console.log('Creating Multi-Location Enterprise product...');
    const enterpriseProduct = await stripe.products.create({
      name: 'Multi-Location Enterprise',
      description: 'For barbershop chains and franchises',
      metadata: {
        tier: 'enterprise',
        features: JSON.stringify([
          'Multiple shop locations',
          'Unlimited barbers',
          '10,000 SMS credits/month',
          '25,000 email credits/month',
          '100,000 AI tokens/month',
          'Enterprise analytics',
          'Dedicated support',
          'Custom integrations',
          'White-label options',
          'API access'
        ])
      }
    });

    // Create prices for Enterprise
    const enterpriseMonthly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 24900, // $249.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Enterprise Monthly',
      metadata: {
        tier: 'enterprise',
        period: 'monthly'
      }
    });

    const enterpriseYearly = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 239040, // $2,390.40 (20% discount)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'Enterprise Yearly',
      metadata: {
        tier: 'enterprise',
        period: 'yearly'
      }
    });

    console.log('✅ Multi-Location Enterprise product created');
    console.log(`   Monthly Price ID: ${enterpriseMonthly.id}`);
    console.log(`   Yearly Price ID: ${enterpriseYearly.id}\n`);

    // Create Customer Portal Configuration
    console.log('Configuring Customer Portal...');
    const portalConfig = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'BookedBarber - Manage Your Subscription',
        privacy_policy_url: 'https://bookbarber.com/privacy',
        terms_of_service_url: 'https://bookbarber.com/terms',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'tax_id', 'address', 'shipping', 'phone', 'name'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'customer_service',
              'too_complex',
              'low_quality',
              'other'
            ]
          }
        },
        subscription_pause: {
          enabled: false, // Can enable if you want to allow pausing
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: barberProduct.id,
              prices: [barberMonthly.id, barberYearly.id]
            },
            {
              product: shopProduct.id,
              prices: [shopMonthly.id, shopYearly.id]
            },
            {
              product: enterpriseProduct.id,
              prices: [enterpriseMonthly.id, enterpriseYearly.id]
            }
          ]
        }
      }
    });

    console.log('✅ Customer Portal configured');
    console.log(`   Portal Config ID: ${portalConfig.id}\n`);

    // Output environment variables
    console.log('========================================');
    console.log('🎉 SUCCESS! Stripe products created');
    console.log('========================================\n');
    console.log('Add these to your .env.local file:\n');
    console.log(`# Stripe Configuration for BookedBarber`);
    console.log(`STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY_HERE'}`);
    console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE\n`);
    console.log(`# Individual Barber Prices`);
    console.log(`STRIPE_BARBER_PRICE_ID=${barberMonthly.id}`);
    console.log(`STRIPE_BARBER_PRICE_ID_YEARLY=${barberYearly.id}\n`);
    console.log(`# Barbershop Prices`);
    console.log(`STRIPE_SHOP_PRICE_ID=${shopMonthly.id}`);
    console.log(`STRIPE_SHOP_PRICE_ID_YEARLY=${shopYearly.id}\n`);
    console.log(`# Enterprise Prices`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterpriseMonthly.id}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID_YEARLY=${enterpriseYearly.id}\n`);
    console.log(`# Customer Portal`);
    console.log(`STRIPE_PORTAL_CONFIG_ID=${portalConfig.id}\n`);

    // Create webhook endpoint
    console.log('Next Step: Configure webhook endpoint in Stripe Dashboard');
    console.log('=========================================================');
    console.log('1. Go to: https://dashboard.stripe.com/webhooks');
    console.log('2. Click "Add endpoint"');
    console.log('3. Endpoint URL: https://bookbarber.com/api/stripe/webhook');
    console.log('4. Select events:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.created');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('   - invoice.payment_succeeded');
    console.log('   - invoice.payment_failed');
    console.log('5. After creation, copy the webhook signing secret');
    console.log('6. Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...\n');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupStripeProducts();