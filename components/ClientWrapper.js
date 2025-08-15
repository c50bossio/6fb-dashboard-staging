'use client'

import { useEffect } from 'react'
import { AppErrorBoundary } from './error-boundary'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'
import ServiceWorkerProvider from './ServiceWorkerProvider'
import errorTracker from '../lib/error-tracker'

export default function ClientWrapper({ children }) {
  useEffect(() => {
    // Initialize error tracking
    errorTracker.init({
      userId: null, // Will be set when user authenticates
      metadata: {
        app: '6FB AI Agent System',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    })
    
    // Initialize Sentry if available
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      errorTracker.initSentry()
    }
    
    console.log('🚨 Error tracking initialized')
  }, [])
  
  return (
    <>
      <SkipToContent />
      <AppErrorBoundary>
        <ServiceWorkerProvider>
          <AccessibilityProvider>
            <ToastProvider>
              <SupabaseAuthProvider>
                {children}
              </SupabaseAuthProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ServiceWorkerProvider>
      </AppErrorBoundary>
    </>
  )
}