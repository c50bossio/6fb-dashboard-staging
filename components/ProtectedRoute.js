'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <LoadingSpinner fullScreen />
  }

  return children
}