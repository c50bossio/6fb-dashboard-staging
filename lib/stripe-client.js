import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
let stripePromise
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    priceId: null,
    features: [
      '10 AI coaching sessions/month',
      'Basic business insights',
      'Email support',
    ],
    limits: {
      sessionsPerMonth: 10,
      agentsAccess: ['business_coach'],
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    features: [
      '100 AI coaching sessions/month',
      'All AI agents access',
      'Advanced insights & analytics',
      'Priority email support',
      'Custom recommendations',
    ],
    limits: {
      sessionsPerMonth: 100,
      agentsAccess: ['business_coach', 'marketing_expert', 'financial_advisor'],
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL,
    features: [
      'Unlimited AI coaching sessions',
      'All AI agents access',
      'Real-time insights',
      'Priority support',
      'Custom AI training',
      'Team collaboration (3 users)',
    ],
    limits: {
      sessionsPerMonth: -1, // Unlimited
      agentsAccess: ['all'],
      teamMembers: 3,
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Custom AI agent creation',
      'API access',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    limits: {
      sessionsPerMonth: -1,
      agentsAccess: ['all'],
      teamMembers: -1,
      customAgents: true,
      apiAccess: true,
    }
  }
}

// Helper functions
export async function createCheckoutSession(priceId, userId, successUrl, cancelUrl) {
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      userId,
      successUrl,
      cancelUrl,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}

export async function createPortalSession(customerId) {
  const response = await fetch('/api/stripe/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create portal session')
  }

  return response.json()
}

export async function getSubscriptionStatus() {
  const response = await fetch('/api/stripe/subscription-status', {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get subscription status')
  }

  return response.json()
}