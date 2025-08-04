'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './SupabaseAuthProvider'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
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