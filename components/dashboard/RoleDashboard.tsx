/**
 * Role-Based Dashboard Router
 * Feature: 011-holistic-staff-management
 *
 * Routes users to appropriate dashboard view based on their role
 * Implements RBAC by showing role-specific components
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import BarberView from './BarberView'
import AdminView from './AdminView'
import { UserRole } from '@/lib/permissions'

interface User {
  id: string
  role: UserRole
  name?: string
  barbershop_id?: string
  managed_locations?: string[]
}

interface RoleDashboardProps {
  userId: string
}

export default function RoleDashboard({ userId }: RoleDashboardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  async function loadUserProfile() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch user profile with role
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, name, barbershop_id, managed_locations')
        .eq('id', userId)
        .single()

      if (error) throw error

      setUser(data as User)
    } catch (err) {
      console.error('Error loading user profile:', err)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={loadUserProfile}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // Route to appropriate view based on role
  switch (user.role) {
    case 'BARBER':
      return <BarberView userId={user.id} userName={user.name} />

    case 'ADMIN':
    case 'MANAGER':
    case 'RECEPTIONIST':
      return <AdminView barbershopId={user.barbershop_id} userName={user.name} />

    default:
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800">Unknown user role: {user.role}</p>
          <p className="text-sm text-yellow-600 mt-2">Please contact support</p>
        </div>
      )
  }
}
