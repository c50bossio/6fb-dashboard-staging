import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export const getStripe = () => stripePromise

// Payment Intent helpers
export const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      metadata
    }),
  })
  
  return response.json()
}

// Subscription helpers
export const createSubscription = async (priceId, customerId) => {
  const response = await fetch('/api/stripe/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      customerId
    }),
  })
  
  return response.json()
}

// Customer helpers
export const createCustomer = async (email, name, metadata = {}) => {
  const response = await fetch('/api/stripe/create-customer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      name,
      metadata
    }),
  })
  
  return response.json()
}
