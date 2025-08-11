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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Good {timeOfDay}, {user?.user_metadata?.full_name || 'Demo User'}!</h1>
              <p className="text-amber-100 text-sm">6FB Barbershop Intelligence Platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Unified Dashboard Component */}
        <UnifiedDashboard user={user} />
      </div>
    </div>
  )
}