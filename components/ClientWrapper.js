'use client'

import { AppErrorBoundary } from './error-boundary'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'
import ServiceWorkerProvider from './ServiceWorkerProvider'

export default function ClientWrapper({ children }) {
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