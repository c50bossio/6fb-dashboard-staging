'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Development mode bypass for calendar testing
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isCalendarPage = window.location.pathname.includes('/calendar')
    
    // Check for dev session or development mode bypass
    const devAuth = document.cookie.includes('dev_auth=true')
    const devSession = localStorage.getItem('dev_session')
    const enableDevBypass = isDevelopment && isCalendarPage
    
    if (devAuth || devSession || enableDevBypass) {
      console.log('🔓 Dev session active - bypassing auth check')
      return
    }
    
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Development mode bypass for calendar testing
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isCalendarPage = typeof window !== 'undefined' && window.location.pathname.includes('/calendar')
  const enableDevBypass = isDevelopment && isCalendarPage

  // Check for dev session or development bypass
  const devAuth = typeof document !== 'undefined' && document.cookie.includes('dev_auth=true')
  const devSession = typeof localStorage !== 'undefined' && localStorage.getItem('dev_session')
  
  if (devAuth || devSession || enableDevBypass) {
    console.log('🔓 DEV MODE: Bypassing protected route for calendar testing')
    return children
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user) {
    return <LoadingSpinner fullScreen />
  }

  return children
}