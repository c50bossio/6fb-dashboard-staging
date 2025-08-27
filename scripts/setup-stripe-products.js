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

require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
  
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function setupStripeProducts() {

  try {
    
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

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    process.exit(1);
  }
}

setupStripeProducts();