'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import LoadingSpinner from './LoadingSpinner'
import { useAuth } from './SupabaseAuthProvider'

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