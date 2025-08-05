#!/bin/bash

# Complete SDK Implementation Script
# Implements all missing SDK integrations identified in the audit

set -e  # Exit on any error

echo "🔧 Implementing missing SDK integrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Install required npm packages
install_frontend_dependencies() {
    print_section "Installing Frontend SDK Dependencies"
    
    cd "$PROJECT_ROOT"
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Creating basic package.json..."
        cat > package.json << 'EOF'
{
  "name": "6fb-ai-agent-system",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 9999",
    "build": "next build",
    "start": "next start -p 9999",
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
    fi
    
    # Install all missing SDK packages
    npm install --save \
        @supabase/supabase-js \
        @stripe/stripe-js \
        stripe \
        pusher-js \
        @novu/notification-center \
        @novu/react \
        posthog-js \
        @sentry/nextjs \
        @sentry/react \
        @vercel/edge-config
    
    print_status "Frontend SDK dependencies installed"
}

# Install backend dependencies
install_backend_dependencies() {
    print_section "Installing Backend SDK Dependencies"
    
    cd "$PROJECT_ROOT"
    
    # Install Python packages
    pip3 install \
        supabase \
        stripe \
        pusher \
        novu \
        posthog \
        sentry-sdk \
        python-dotenv
    
    print_status "Backend SDK dependencies installed"
}

# Implement Supabase SDK
implement_supabase_sdk() {
    print_section "Implementing Supabase SDK"
    
    # Create Supabase client configuration
    cat > "$PROJECT_ROOT/lib/supabase.js" << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Database helpers
export const insertRecord = async (table, data) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
  return { data: result, error }
}

export const getRecords = async (table, filters = {}) => {
  let query = supabase.from(table).select('*')
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  
  const { data, error } = await query
  return { data, error }
}

export const updateRecord = async (table, id, updates) => {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteRecord = async (table, id) => {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
  return { data, error }
}
EOF
    
    # Create auth context provider
    mkdir -p "$PROJECT_ROOT/contexts"
    cat > "$PROJECT_ROOT/contexts/AuthContext.js" << 'EOF'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signUp: (email, password, metadata) => signUp(email, password, metadata),
    signIn: (email, password) => signIn(email, password),
    signOut: () => signOut()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
EOF
    
    print_status "Supabase SDK implemented with auth context"
}

# Implement Stripe SDK
implement_stripe_sdk() {
    print_section "Implementing Stripe SDK"
    
    # Create Stripe client configuration
    mkdir -p "$PROJECT_ROOT/lib"
    cat > "$PROJECT_ROOT/lib/stripe.js" << 'EOF'
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
EOF
    
    # Create Stripe API routes
    mkdir -p "$PROJECT_ROOT/app/api/stripe"
    
    # Payment Intent API
    cat > "$PROJECT_ROOT/app/api/stripe/create-payment-intent/route.js" << 'EOF'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { amount, currency = 'usd', metadata = {} } = await request.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error) {
    console.error('Stripe Payment Intent Error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
EOF
    
    # Customer API
    cat > "$PROJECT_ROOT/app/api/stripe/create-customer/route.js" << 'EOF'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { email, name, metadata = {} } = await request.json()

    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    })

    return NextResponse.json({
      customerId: customer.id,
      customer
    })
  } catch (error) {
    console.error('Stripe Customer Error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
EOF
    
    # Subscription API
    cat > "$PROJECT_ROOT/app/api/stripe/create-subscription/route.js" << 'EOF'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { priceId, customerId } = await request.json()

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    })
  } catch (error) {
    console.error('Stripe Subscription Error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
EOF
    
    print_status "Stripe SDK implemented with payment processing"
}

# Implement Pusher SDK
implement_pusher_sdk() {
    print_section "Implementing Pusher SDK"
    
    # Create Pusher client configuration
    cat > "$PROJECT_ROOT/lib/pusher.js" << 'EOF'
import Pusher from 'pusher-js'

let pusherInstance = null

export const getPusher = () => {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      encrypted: true,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    })
  }
  
  return pusherInstance
}

// Real-time messaging helpers
export const subscribeToChannel = (channelName, eventHandlers = {}) => {
  const pusher = getPusher()
  const channel = pusher.subscribe(channelName)
  
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    channel.bind(event, handler)
  })
  
  return channel
}

export const unsubscribeFromChannel = (channelName) => {
  const pusher = getPusher()
  pusher.unsubscribe(channelName)
}

// Presence channel helpers
export const subscribeToPresenceChannel = (channelName, callbacks = {}) => {
  const pusher = getPusher()
  const channel = pusher.subscribe(channelName)
  
  if (callbacks.onSubscriptionSucceeded) {
    channel.bind('pusher:subscription_succeeded', callbacks.onSubscriptionSucceeded)
  }
  
  if (callbacks.onMemberAdded) {
    channel.bind('pusher:member_added', callbacks.onMemberAdded)
  }
  
  if (callbacks.onMemberRemoved) {
    channel.bind('pusher:member_removed', callbacks.onMemberRemoved)
  }
  
  return channel
}
EOF
    
    # Create Pusher auth API
    mkdir -p "$PROJECT_ROOT/app/api/pusher"
    cat > "$PROJECT_ROOT/app/api/pusher/auth/route.js" << 'EOF'
import { NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true
})

export async function POST(request) {
  try {
    const { socket_id, channel_name } = await request.json()
    
    // Add authentication logic here
    // For now, we'll allow all connections
    const auth = pusher.authenticate(socket_id, channel_name)
    
    return NextResponse.json(auth)
  } catch (error) {
    console.error('Pusher Auth Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
EOF
    
    # Create real-time hook
    mkdir -p "$PROJECT_ROOT/hooks"
    cat > "$PROJECT_ROOT/hooks/useRealTime.js" << 'EOF'
import { useEffect, useState } from 'react'
import { subscribeToChannel, unsubscribeFromChannel } from '../lib/pusher'

export const useRealTime = (channelName, eventHandlers = {}) => {
  const [channel, setChannel] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const newChannel = subscribeToChannel(channelName, {
      ...eventHandlers,
      'pusher:subscription_succeeded': () => {
        setConnected(true)
        if (eventHandlers['pusher:subscription_succeeded']) {
          eventHandlers['pusher:subscription_succeeded']()
        }
      }
    })

    setChannel(newChannel)

    return () => {
      unsubscribeFromChannel(channelName)
      setConnected(false)
    }
  }, [channelName])

  return { channel, connected }
}
EOF
    
    print_status "Pusher SDK implemented with real-time messaging"
}

# Implement PostHog SDK
implement_posthog_sdk() {
    print_section "Implementing PostHog SDK"
    
    # Create PostHog client configuration
    cat > "$PROJECT_ROOT/lib/posthog.js" << 'EOF'
import posthog from 'posthog-js'

let posthogInstance = null

export const initPostHog = () => {
  if (typeof window !== 'undefined' && !posthogInstance) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      }
    })
    posthogInstance = posthog
  }
  
  return posthogInstance
}

export const getPostHog = () => {
  if (!posthogInstance) {
    initPostHog()
  }
  return posthogInstance
}

// Analytics helpers
export const trackEvent = (eventName, properties = {}) => {
  const ph = getPostHog()
  if (ph) {
    ph.capture(eventName, properties)
  }
}

export const identifyUser = (userId, properties = {}) => {
  const ph = getPostHog()
  if (ph) {
    ph.identify(userId, properties)
  }
}

export const setUserProperties = (properties) => {
  const ph = getPostHog()
  if (ph) {
    ph.people.set(properties)
  }
}

export const startSession = () => {
  const ph = getPostHog()
  if (ph) {
    ph.startSessionRecording()
  }
}

export const stopSession = () => {
  const ph = getPostHog()
  if (ph) {
    ph.stopSessionRecording()
  }
}
EOF
    
    # Create PostHog provider
    cat > "$PROJECT_ROOT/components/PostHogProvider.js" << 'EOF'
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, trackEvent } from '../lib/posthog'

export function PostHogProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize PostHog
    initPostHog()
  }, [])

  useEffect(() => {
    // Track page views
    if (pathname) {
      trackEvent('$pageview', {
        $current_url: pathname + (searchParams ? '?' + searchParams.toString() : '')
      })
    }
  }, [pathname, searchParams])

  return children
}
EOF
    
    print_status "PostHog SDK implemented with analytics tracking"
}

# Implement Sentry SDK
implement_sentry_sdk() {
    print_section "Implementing Sentry SDK"
    
    # Create Sentry configuration
    cat > "$PROJECT_ROOT/sentry.client.config.js" << 'EOF'
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
EOF
    
    cat > "$PROJECT_ROOT/sentry.server.config.js" << 'EOF'
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
})
EOF
    
    # Create error boundary component
    mkdir -p "$PROJECT_ROOT/components"
    cat > "$PROJECT_ROOT/components/ErrorBoundary.js" << 'EOF'
'use client'

import { Component } from 'react'
import * as Sentry from '@sentry/nextjs'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { contexts: { react: { errorInfo } } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                We apologize for the inconvenience. The error has been reported to our team.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
EOF
    
    print_status "Sentry SDK implemented with error tracking"
}

# Implement Cloudflare Turnstile SDK
implement_turnstile_sdk() {
    print_section "Implementing Cloudflare Turnstile SDK"
    
    # Create Turnstile component
    cat > "$PROJECT_ROOT/components/TurnstileWidget.js" << 'EOF'
'use client'

import { useEffect, useRef, useState } from 'react'

export function TurnstileWidget({ onVerify, onError, onExpire, theme = 'light' }) {
  const widgetRef = useRef(null)
  const [widgetId, setWidgetId] = useState(null)

  useEffect(() => {
    const loadTurnstile = () => {
      if (window.turnstile && widgetRef.current) {
        const id = window.turnstile.render(widgetRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': onExpire,
          theme
        })
        setWidgetId(id)
      }
    }

    if (window.turnstile) {
      loadTurnstile()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = loadTurnstile
      document.head.appendChild(script)
    }

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [onVerify, onError, onExpire, theme])

  return <div ref={widgetRef}></div>
}

// Hook for Turnstile verification
export function useTurnstile() {
  const [token, setToken] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState(null)

  const handleVerify = (token) => {
    setToken(token)
    setIsVerified(true)
    setError(null)
  }

  const handleError = (error) => {
    setError(error)
    setIsVerified(false)
    setToken(null)
  }

  const handleExpire = () => {
    setIsVerified(false)
    setToken(null)
  }

  const reset = () => {
    setToken(null)
    setIsVerified(false)
    setError(null)
  }

  return {
    token,
    isVerified,
    error,
    handleVerify,
    handleError,
    handleExpire,
    reset
  }
}
EOF
    
    # Create Turnstile verification API
    mkdir -p "$PROJECT_ROOT/app/api/turnstile"
    cat > "$PROJECT_ROOT/app/api/turnstile/verify/route.js" << 'EOF'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    const data = await response.json()

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Verification failed', details: data['error-codes'] },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
EOF
    
    print_status "Cloudflare Turnstile SDK implemented with CAPTCHA protection"
}

# Implement Novu SDK
implement_novu_sdk() {
    print_section "Implementing Novu SDK"
    
    # Create Novu client configuration
    cat > "$PROJECT_ROOT/lib/novu.js" << 'EOF'
import { NovuApi } from '@novu/react'

let novuInstance = null

export const getNovu = () => {
  if (!novuInstance) {
    novuInstance = new NovuApi({
      backendUrl: process.env.NEXT_PUBLIC_NOVU_API_URL || 'https://api.novu.co',
      applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    })
  }
  
  return novuInstance
}

// Notification helpers
export const markNotificationAsRead = async (messageId) => {
  const novu = getNovu()
  try {
    await novu.markMessageAsRead(messageId)
    return { success: true }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, error }
  }
}

export const markAllNotificationsAsRead = async () => {
  const novu = getNovu()
  try {
    await novu.markAllMessagesAsRead()
    return { success: true }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return { success: false, error }
  }
}

export const getNotifications = async (page = 0) => {
  const novu = getNovu()
  try {
    const response = await novu.getNotificationsList(page)
    return { success: true, data: response }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, error }
  }
}
EOF
    
    # Create Novu notification center component
    cat > "$PROJECT_ROOT/components/NotificationCenter.js" << 'EOF'
'use client'

import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/notification-center'

export function NotificationCenter({ subscriberId, onNotificationClick }) {
  return (
    <NovuProvider
      subscriberId={subscriberId}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
    >
      <PopoverNotificationCenter onNotificationClick={onNotificationClick}>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  )
}

// Hook for notification management
export function useNotifications(subscriberId) {
  const [notifications, setNotifications] = useState([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subscriberId) {
      fetchNotifications()
    }
  }, [subscriberId])

  const fetchNotifications = async () => {
    setLoading(true)
    const result = await getNotifications()
    if (result.success) {
      setNotifications(result.data.data)
      setUnseenCount(result.data.totalUnseenCount)
    }
    setLoading(false)
  }

  const markAsRead = async (messageId) => {
    const result = await markNotificationAsRead(messageId)
    if (result.success) {
      await fetchNotifications()
    }
    return result
  }

  const markAllAsRead = async () => {
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      await fetchNotifications()
    }
    return result
  }

  return {
    notifications,
    unseenCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  }
}
EOF
    
    print_status "Novu SDK implemented with notification center"
}

# Implement Vercel Edge Config SDK
implement_vercel_sdk() {
    print_section "Implementing Vercel Edge Config SDK"
    
    # Create Edge Config helpers
    cat > "$PROJECT_ROOT/lib/edge-config.js" << 'EOF'
import { get, getAll, has } from '@vercel/edge-config'

// Feature flag helpers
export const getFeatureFlag = async (flagName, defaultValue = false) => {
  try {
    const value = await get(flagName)
    return value !== undefined ? value : defaultValue
  } catch (error) {
    console.error('Edge Config error:', error)
    return defaultValue
  }
}

export const getAllFeatureFlags = async () => {
  try {
    return await getAll()
  } catch (error) {
    console.error('Edge Config error:', error)
    return {}
  }
}

export const hasFeatureFlag = async (flagName) => {
  try {
    return await has(flagName)
  } catch (error) {
    console.error('Edge Config error:', error)
    return false
  }
}

// Configuration helpers
export const getConfig = async (configKey, defaultValue = null) => {
  try {
    const value = await get(configKey)
    return value !== undefined ? value : defaultValue
  } catch (error) {
    console.error('Edge Config error:', error)
    return defaultValue
  }
}

// A/B testing helpers
export const getExperiment = async (experimentName, userId) => {
  try {
    const experiment = await get(`experiment_${experimentName}`)
    if (!experiment || !experiment.enabled) {
      return { variant: 'control', enabled: false }
    }

    // Simple hash-based assignment
    const hash = hashString(userId + experimentName)
    const variant = (hash % 100) < experiment.percentage ? experiment.treatment : 'control'
    
    return { variant, enabled: true, percentage: experiment.percentage }
  } catch (error) {
    console.error('Edge Config experiment error:', error)
    return { variant: 'control', enabled: false }
  }
}

// Simple hash function for consistent assignment
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}
EOF
    
    # Create feature flag hook
    cat > "$PROJECT_ROOT/hooks/useFeatureFlag.js" << 'EOF'
import { useState, useEffect } from 'react'
import { getFeatureFlag } from '../lib/edge-config'

export function useFeatureFlag(flagName, defaultValue = false) {
  const [flag, setFlag] = useState(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFlag = async () => {
      try {
        const value = await getFeatureFlag(flagName, defaultValue)
        setFlag(value)
      } catch (error) {
        console.error('Feature flag error:', error)
        setFlag(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    fetchFlag()
  }, [flagName, defaultValue])

  return { flag, loading }
}

export function useExperiment(experimentName, userId) {
  const [experiment, setExperiment] = useState({ variant: 'control', enabled: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExperiment = async () => {
      try {
        const result = await getExperiment(experimentName, userId)
        setExperiment(result)
      } catch (error) {
        console.error('Experiment error:', error)
        setExperiment({ variant: 'control', enabled: false })
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchExperiment()
    }
  }, [experimentName, userId])

  return { ...experiment, loading }
}
EOF
    
    print_status "Vercel Edge Config SDK implemented with feature flags"
}

# Update root layout to include all providers
update_root_layout() {
    print_section "Updating Root Layout with SDK Providers"
    
    # Check if layout.js exists, if not create it
    if [[ ! -f "$PROJECT_ROOT/app/layout.js" ]]; then
        mkdir -p "$PROJECT_ROOT/app"
        cat > "$PROJECT_ROOT/app/layout.js" << 'EOF'
import './globals.css'

export const metadata = {
  title: '6FB AI Agent System',
  description: 'AI-powered agent system for business automation',
}
EOF
    fi
    
    # Update layout to include all providers
    cat > "$PROJECT_ROOT/app/layout.js" << 'EOF'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { PostHogProvider } from '../components/PostHogProvider'
import ErrorBoundary from '../components/ErrorBoundary'

export const metadata = {
  title: '6FB AI Agent System',
  description: 'AI-powered agent system for business automation and integration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
EOF
    
    print_status "Root layout updated with all SDK providers"
}

# Create basic globals.css if it doesn't exist
create_basic_styles() {
    if [[ ! -f "$PROJECT_ROOT/app/globals.css" ]]; then
        cat > "$PROJECT_ROOT/app/globals.css" << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

a {
  color: inherit;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  html {
    color-scheme: dark;
  }
}
EOF
        print_status "Basic styles created"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔧 6FB AI Agent System - SDK Implementation${NC}"
    echo -e "${BLUE}===============================================${NC}"
    
    install_frontend_dependencies
    install_backend_dependencies
    implement_supabase_sdk
    implement_stripe_sdk
    implement_pusher_sdk
    implement_posthog_sdk
    implement_sentry_sdk
    implement_turnstile_sdk
    implement_novu_sdk
    implement_vercel_sdk
    update_root_layout
    create_basic_styles
    
    echo -e "\n${GREEN}✅ All missing SDK integrations implemented!${NC}"
    echo
    echo -e "${BLUE}Implemented SDKs:${NC}"
    echo "• ✅ Supabase - Database and authentication"
    echo "• ✅ Stripe - Payment processing" 
    echo "• ✅ Pusher - Real-time messaging"
    echo "• ✅ PostHog - Analytics and session recording"
    echo "• ✅ Sentry - Error tracking and monitoring"
    echo "• ✅ Cloudflare Turnstile - CAPTCHA protection"
    echo "• ✅ Novu - Notification center"
    echo "• ✅ Vercel Edge Config - Feature flags"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Run the SDK audit again: ./scripts/sdk-integration-audit.sh"
    echo "2. Test all integrations with: npm run dev"
    echo "3. Configure API keys for any missing services"
    echo "4. Test end-to-end functionality"
    echo
    echo -e "${GREEN}🎉 SDK Integration Status: COMPLETE${NC}"
}

# Run main function
main "$@"