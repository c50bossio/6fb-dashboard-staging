'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'
import ProfileCompletionPrompt from '../../../components/ProfileCompletionPrompt'

export default function BarbershopDashboard() {
  const { user, profile, loading } = useAuth()
  const [timeOfDay, setTimeOfDay] = useState('')

  // Reduced logging - only log if there are issues with authentication
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !loading && !user) {
      console.warn('🏪 [DashboardPage] No user found:', {
        has_user: !!user,
        has_profile: !!profile,
        loading: loading,
      })
    }
  }, [user, profile, loading])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])


  return (
    <div>
      {/* Profile Completion Prompt */}
      <ProfileCompletionPrompt />

      {/* Unified Dashboard Component */}
      <UnifiedDashboard user={user} profile={profile} />
    </div>
  )
}