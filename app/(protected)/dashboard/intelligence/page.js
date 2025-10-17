'use client'

import BusinessIntelligenceDashboard from '@/components/dashboard/BusinessIntelligenceDashboard'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function BusinessIntelligencePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4 text-gray-400">Loading Business Intelligence Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <BusinessIntelligenceDashboard />
}