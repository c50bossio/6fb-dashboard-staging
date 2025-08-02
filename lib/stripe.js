import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: false,
})

// Pricing configuration
export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    currency: 'usd',
    interval: null,
    features: [
      '1 AI Agent',
      '100 chats/month',
      'Basic calendar',
      'Email support',
    ],
    limits: {
      agents: 1,
      chats: 100,
      barbers: 2,
      bookings: 50,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small barbershops',
    price: 4500, // $45.00 in cents
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    features: [
      '5 AI Agents',
      '1,000 chats/month',
      'Advanced calendar',
      'SMS notifications',
      'Priority support',
    ],
    limits: {
      agents: 5,
      chats: 1000,
      barbers: 5,
      bookings: 500,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing barbershops',
    price: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    features: [
      'Unlimited AI Agents',
      '10,000 chats/month',
      'Premium calendar features',
      'SMS & WhatsApp',
      'Analytics dashboard',
      'API access',
      '24/7 support',
    ],
    limits: {
      agents: -1, // unlimited
      chats: 10000,
      barbers: 20,
      bookings: 5000,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solution for chains',
    price: null, // Custom pricing
    currency: 'usd',
    interval: 'month',
    stripePriceId: null,
    features: [
      'Everything in Professional',
      'Custom AI training',
      'White labeling',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
    limits: {
      agents: -1,
      chats: -1,
      barbers: -1,
      bookings: -1,
    },
  },
}

// Helper functions
export function formatPrice(cents, currency = 'usd') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
  return formatter.format(cents / 100)
}

export function getPlanByPriceId(priceId) {
  return Object.values(PRICING_PLANS).find(plan => plan.stripePriceId === priceId)
}

export function getPlanById(planId) {
  return PRICING_PLANS[planId]
}

export function isFeatureAvailable(userPlan, feature) {
  const plan = PRICING_PLANS[userPlan] || PRICING_PLANS.free
  const limits = plan.limits
  
  switch (feature) {
    case 'unlimited_agents':
      return limits.agents === -1
    case 'unlimited_chats':
      return limits.chats === -1
    case 'api_access':
      return ['professional', 'enterprise'].includes(userPlan)
    case 'white_label':
      return userPlan === 'enterprise'
    default:
      return true
  }
}

export function checkPlanLimit(userPlan, resource, currentUsage) {
  const plan = PRICING_PLANS[userPlan] || PRICING_PLANS.free
  const limit = plan.limits[resource]
  
  if (limit === -1) return { allowed: true, limit: 'unlimited' }
  
  return {
    allowed: currentUsage < limit,
    limit,
    remaining: Math.max(0, limit - currentUsage),
    percentage: (currentUsage / limit) * 100,
  }
}