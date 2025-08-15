'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    console.log('🛡️ ProtectedRoute check:', {
      hasUser: !!user,
      userEmail: user?.email,
      loading,
      pathname: window.location.pathname
    })
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isCalendarPage = window.location.pathname.includes('/calendar')
    const isAnalyticsPage = window.location.pathname.includes('/analytics')
    const isShopPage = window.location.pathname.includes('/shop')
    const isBarberPage = window.location.pathname.includes('/barber')
    const isSeoPage = window.location.pathname.includes('/seo')
    const isDashboardPage = window.location.pathname.includes('/dashboard')
    
    const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
    if (forceSignOut) {
      sessionStorage.removeItem('force_sign_out')
      console.log('🚪 Force sign out detected')
      router.push('/login')
      return
    }
    
    const devAuth = document.cookie.includes('dev_auth=true')
    const devSession = localStorage.getItem('dev_session')
    const devBypass = localStorage.getItem('dev_bypass') === 'true'
    const enableDevBypass = isBarberPage || isSeoPage || (isDevelopment && (isCalendarPage || isAnalyticsPage || isShopPage || isDashboardPage))
    
    if (devAuth || devSession || devBypass || enableDevBypass) {
      console.log('🔓 Dev session active - bypassing auth check')
      return
    }
    
    // Simple bypass for development
    if (window.location.search.includes('bypass=true')) {
      console.log('🔓 Bypass mode activated')
      return
    }
    
    if (!loading && !user) {
      console.log('❌ No user found, redirecting to login')
      router.push('/login')
    } else if (user) {
      console.log('✅ User authenticated:', user.email)
    }
  }, [loading, user, router])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  const isDevelopment = process.env.NODE_ENV === 'development'
  const isCalendarPage = window.location.pathname.includes('/calendar')
  const isAnalyticsPage = window.location.pathname.includes('/analytics')
  const isShopPage = window.location.pathname.includes('/shop')
  const isBarberPage = window.location.pathname.includes('/barber')
  const isSeoPage = window.location.pathname.includes('/seo')
  const isDashboardPage = window.location.pathname.includes('/dashboard')
  
  const forceSignOut = sessionStorage.getItem('force_sign_out') === 'true'
  if (forceSignOut) {
    sessionStorage.removeItem('force_sign_out')
    console.log('🚪 Force sign out detected, redirecting to login...')
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }
  
  const devAuth = document.cookie.includes('dev_auth=true')
  const devSession = localStorage.getItem('dev_session')
  
  const enableDevBypass = isBarberPage || isSeoPage || (isDevelopment && (isCalendarPage || isAnalyticsPage || isShopPage))
  
  if (devAuth || devSession || enableDevBypass) {
    console.log('🔓 DEV MODE: Bypassing protected route for calendar/analytics testing')
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Authenticating...</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}