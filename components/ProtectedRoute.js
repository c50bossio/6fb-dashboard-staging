'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check for dev session first
    const devAuth = document.cookie.includes('dev_auth=true')
    const devSession = localStorage.getItem('dev_session')
    
    if (devAuth || devSession) {
      console.log('🔓 Dev session active - bypassing auth')
      return
    }
    
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user) {
    return <LoadingSpinner fullScreen />
  }

  return children
}