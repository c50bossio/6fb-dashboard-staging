'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'
import devErrorSuppressor from '../lib/dev-error-suppressor'
import { errorHandler } from '../lib/error-handler'
import errorTracker from '../lib/error-tracker'
import { initializeFallbackSystems } from '../lib/fallback-systems'
import { getProductionMonitor } from '../lib/production-monitor'
import preventAnalyticsErrors from '../lib/analytics-prevention'
import AuthErrorBoundary from './AuthErrorBoundary'
import { AppErrorBoundary } from './error-boundary'
import { QueryProvider } from './QueryProvider'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
// import { TestAuthProvider as SupabaseAuthProvider } from './TestAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'
import BookedBarberNotification from './ui/BookedBarberNotification'
import AuthTest from './AuthTest'

// Lazy load non-critical providers
const ServiceWorkerProvider = dynamic(() => import('./ServiceWorkerProvider'), {
  ssr: false
})

const StripeModeBanner = dynamic(() => import('./StripeModeBanner'), {
  ssr: false
})

// Combined context provider to reduce nesting
function CombinedProviders({ children }) {
  // Memoize providers to prevent unnecessary re-renders
  const providers = useMemo(
    () => [
      AccessibilityProvider,
      ToastProvider,
      QueryProvider,
      // Wrap SupabaseAuthProvider with AuthErrorBoundary for extra protection
      ({ children }) => (
        <AuthErrorBoundary>
          <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        </AuthErrorBoundary>
      )
    ],
    []
  )

  return providers.reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  )
}

export default function ClientWrapper({ children }) {
  useEffect(() => {
    // Prevent phantom analytics script loading errors
    preventAnalyticsErrors()
    
    // Initialize development error suppression (development only)
    if (process.env.NODE_ENV === 'development') {
      // Dev error suppressor and analytics prevention initialized silently
      // Debug logging can be enabled via NEXT_PUBLIC_DEBUG_CLIENT_WRAPPER
      if (process.env.NEXT_PUBLIC_DEBUG_CLIENT_WRAPPER) {
        console.log('🤫 Development error suppressor initialized')
        console.log('🚫 Analytics prevention measures active')
      }
    }
    
    // Initialize error tracking in production only
    if (process.env.NODE_ENV === 'production') {
      errorTracker.init({
        userId: null, // Will be set when user authenticates
        metadata: {
          app: '6FB AI Agent System',
          version: '1.0.0',
          environment: process.env.NODE_ENV
        }
      })
      
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        errorTracker.initSentry()
      }
    }
    
    // Initialize production monitoring (always active for metrics collection)
    const monitor = getProductionMonitor()
    
    // Initialize fallback systems for graceful degradation
    initializeFallbackSystems()
    
    // Initialize global error handler
    errorHandler.setupGlobalHandlers()
    
    // Set up global error handlers
    const originalConsoleError = console.error
    console.error = (...args) => {
      originalConsoleError(...args)
      // Track console errors in production monitoring with null checks
      if (args[0] instanceof Error) {
        monitor.trackError(args[0], { type: 'console_error', args: args.slice(1) })
        // Add null check before error handler invocation
        if (args[0] && errorHandler && typeof errorHandler.handleError === 'function') {
          errorHandler.handleError(args[0], 'console_error', { args: args.slice(1) })
        }
      } else if (typeof args[0] === 'string' && args[0].toLowerCase().includes('error')) {
        const error = new Error(args[0])
        monitor.trackError(error, { type: 'console_error', args: args.slice(1) })
        // Add null check before error handler invocation
        if (error && errorHandler && typeof errorHandler.handleError === 'function') {
          errorHandler.handleError(error, 'console_error', { args: args.slice(1) })
        }
      }
    }
    
    // Preconnect to external domains for faster loading
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ].filter(Boolean)
    
    preconnectDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      document.head.appendChild(link)
    })
  }, [])
  
  return (
    <>
      <AuthTest />
      <SkipToContent />
      {/* <StripeModeBanner /> */}
      <AppErrorBoundary>
        <ServiceWorkerProvider>
          <CombinedProviders>
            {children}
            <BookedBarberNotification />
          </CombinedProviders>
        </ServiceWorkerProvider>
      </AppErrorBoundary>
    </>
  )
}