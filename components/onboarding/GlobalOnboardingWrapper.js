'use client'

import { useAuth } from '../SupabaseAuthProvider'
import GlobalOnboardingProvider from './GlobalOnboardingProvider'

export default function GlobalOnboardingWrapper({ children }) {
  const { user, loading } = useAuth()
  
  // Don't render onboarding provider until auth is loaded
  if (loading) {
    return children
  }
  
  return (
    <GlobalOnboardingProvider user={user}>
      {children}
    </GlobalOnboardingProvider>
  )
}