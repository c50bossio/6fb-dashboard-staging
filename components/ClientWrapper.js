'use client'

import { AppErrorBoundary } from './error-boundary'
import { SupabaseAuthProvider } from './SupabaseAuthProvider'
import { ToastProvider } from './ToastContainer'
import { AccessibilityProvider, SkipToContent } from './ui/AccessibilityProvider'
import ServiceWorkerProvider from './ServiceWorkerProvider'
import GlobalOnboardingWrapper from './onboarding/GlobalOnboardingWrapper'

export default function ClientWrapper({ children }) {
  return (
    <>
      <SkipToContent />
      <AppErrorBoundary>
        <ServiceWorkerProvider>
          <AccessibilityProvider>
            <ToastProvider>
              <SupabaseAuthProvider>
                <GlobalOnboardingWrapper>
                  {children}
                </GlobalOnboardingWrapper>
              </SupabaseAuthProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ServiceWorkerProvider>
      </AppErrorBoundary>
    </>
  )
}