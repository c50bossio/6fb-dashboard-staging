'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'
import devErrorSuppressor from '../lib/dev-error-suppressor'
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

// Restore SupabaseAuthProvider but with fixed circular dependencies
function CombinedProviders({ children }) {
  return (
    <QueryProvider>
      <SupabaseAuthProvider>
        {children}
      </SupabaseAuthProvider>
    </QueryProvider>
  )
}

export default function ClientWrapper({ children }) {
  useEffect(() => {
    // Minimal initialization for debugging
    console.log('🔧 ClientWrapper initialized in', process.env.NODE_ENV, 'mode')
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