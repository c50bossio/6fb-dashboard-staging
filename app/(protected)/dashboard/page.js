'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BarbershopDashboard() {
  console.log('🏪 BarbershopDashboard component loading...')
  
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  
  console.log('📊 Dashboard state:', {
    hasUser: !!user,
    userEmail: user?.email,
    hasProfile: !!profile,
    profileOnboarding: profile?.onboarding_completed,
    loading
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])
  
  useEffect(() => {
    console.log('🔍 Dashboard checking onboarding status...', {
      hasProfile: !!profile,
      profile: profile,
      onboarding: profile?.onboarding_completed,
      loading: loading
    })
    
    // Only redirect if we have a profile and onboarding is explicitly false
    // Don't redirect if profile is still loading
    if (!loading && profile && profile.onboarding_completed === false) {
      console.log('📝 Onboarding incomplete, redirecting to welcome')
      router.push('/welcome')
    } else if (!loading && !profile && user) {
      console.log('⚠️ User exists but no profile, may need to create one')
    }
  }, [profile, router, loading, user])


  // Show loading state while checking onboarding
  if (loading || (!profile && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }
  
  // If profile needs onboarding, show loading while redirect happens
  if (profile && profile.onboarding_completed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Redirecting to setup...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      {/* Unified Dashboard Component */}
      <UnifiedDashboard user={user} />
    </div>
  )
}