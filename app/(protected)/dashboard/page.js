'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import UnifiedDashboard from '../../../components/dashboard/UnifiedDashboard'

export default function BarbershopDashboard() {
  console.log('🏪 BarbershopDashboard component loading...')
  
  const { user } = useAuth()
  const [timeOfDay, setTimeOfDay] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')
  }, [])


  return (
    <div>
      {/* Unified Dashboard Component */}
      <UnifiedDashboard user={user} />
    </div>
  )
}