'use client'

import ErrorBoundary from './ErrorBoundary'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'

export default function ClientWrapper({ children }) {
  return (
    <>
      <SkipToContent />
      <ErrorBoundary>
        <AccessibilityProvider>
          <ToastProvider>
            <SupabaseAuthProvider>
              {children}
            </SupabaseAuthProvider>
          </ToastProvider>
        </AccessibilityProvider>
      </ErrorBoundary>
    </>
  )
}