'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import errorTracker from '../lib/error-tracker'
import { AppErrorBoundary } from './error-boundary'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'

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
      SupabaseAuthProvider
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
      <SkipToContent />
      <StripeModeBanner />
      <AppErrorBoundary>
        <ServiceWorkerProvider>
          <CombinedProviders>
            {children}
          </CombinedProviders>
        </ServiceWorkerProvider>
      </AppErrorBoundary>
    </>
  )
}