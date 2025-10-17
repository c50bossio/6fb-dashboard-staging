import { loadStripe } from '@stripe/stripe-js'

let stripePromise
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

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

// Booking-specific payment functions
export async function createBookingPaymentIntent({
  booking_id,
  service_id,
  barber_id,
  shop_id,
  amount,
  payment_type = 'full_payment',
  customer_email,
  customer_name,
  save_payment_method = false,
  automatic_confirmation = true
}) {
  const response = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      booking_id,
      service_id,
      barber_id,
      shop_id,
      amount,
      payment_type,
      customer_email,
      customer_name,
      save_payment_method,
      automatic_confirmation
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create payment intent')
  }

  return response.json()
}

export async function confirmBookingPayment(payment_intent_id) {
  const response = await fetch('/api/payments/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_intent_id,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to confirm payment')
  }

  return response.json()
}

export async function processBookingPayment({
  stripe,
  elements,
  paymentIntentClientSecret,
  customerInfo,
  cardElement
}) {
  if (!stripe || !elements) {
    throw new Error('Stripe not initialized')
  }

  const { error, paymentIntent } = await stripe.confirmCardPayment(
    paymentIntentClientSecret,
    {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        },
      }
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return paymentIntent
}

// Payment method management for bookings
export async function savePaymentMethod({
  stripe,
  elements,
  customerId,
  cardElement,
  billingDetails
}) {
  if (!stripe || !elements) {
    throw new Error('Stripe not initialized')
  }

  const { error, setupIntent } = await stripe.confirmCardSetup(
    customerId, // This should be a setup intent client secret
    {
      payment_method: {
        card: cardElement,
        billing_details,
      }
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return setupIntent
}

// Helper function to format price for display
export function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100)
}

// Calculate deposit amount
export function calculateDepositAmount(totalAmount, depositPercentage = 25) {
  return Math.round(totalAmount * (depositPercentage / 100))
}

// Payment type configurations for bookings
export const BOOKING_PAYMENT_TYPES = {
  deposit: {
    id: 'deposit',
    name: 'Deposit Payment',
    description: 'Pay a deposit now, remaining balance at appointment',
    capture_method: 'manual'
  },
  full_payment: {
    id: 'full_payment', 
    name: 'Full Payment',
    description: 'Pay the full amount now',
    capture_method: 'automatic'
  },
  in_person: {
    id: 'in_person',
    name: 'Pay at Shop',
    description: 'Pay when you arrive for your appointment',
    capture_method: null
  }
}