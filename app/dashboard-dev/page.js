'use client'

import { useState, useEffect } from 'react'
import UnifiedDashboard from '@/components/dashboard/UnifiedDashboard'

// Mock auth context for development
const mockAuthContext = {
  user: {
    id: 'dev-user-123',
    email: 'dev@6fb.local',
    user_metadata: { full_name: 'Development User' }
  },
  profile: {
    id: 'dev-user-123',
    email: 'dev@6fb.local',
    full_name: 'Development User',
    subscription_tier: 'pro',
    subscription_status: 'active',
    role: 'SHOP_OWNER',
    barbershop_id: 'dev-shop-123',
    barberbarbershop_id: 'dev-shop-123'
  },
  loading: false,
  isAuthenticated: true,
  signOut: async () => console.log('Mock sign out'),
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ 
        data: { 
          user: {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            user_metadata: { full_name: 'Development User' }
          }
        }, 
        error: null 
      })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ 
            data: {
              id: 'dev-shop-123',
              name: 'Development Barbershop',
              owner_id: 'dev-user-123'
            }, 
            error: null 
          })
        }),
        in: () => ({ data: [], error: null })
      })
    })
  }
}

// Mock dashboard data for development
const mockDashboardData = {
  revenue: {
    total: 15750,
    growth: 12.5,
    chart: [
      { date: '2024-01-01', value: 2500 },
      { date: '2024-01-02', value: 2800 },
      { date: '2024-01-03', value: 3200 },
      { date: '2024-01-04', value: 2900 },
      { date: '2024-01-05', value: 3100 },
      { date: '2024-01-06', value: 3500 },
      { date: '2024-01-07', value: 3750 }
    ]
  },
  appointments: {
    total: 127,
    growth: 8.3,
    upcoming: 42,
    completed: 85
  },
  customers: {
    total: 89,
    new: 12,
    returning: 77,
    retentionRate: 86.5
  },
  performance: {
    rating: 4.8,
    reviews: 34,
    responseTime: '< 1 hour',
    bookingRate: 92
  }
}

export default function DashboardDev() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('📱 DEV DASHBOARD: Loaded with mock data')
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading development dashboard...</p>
        </div>
      </div>
    )
  }

  // Create a mock context that UnifiedDashboard can use
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Development Dashboard</h1>
              <p className="text-sm text-gray-500">Mock data for testing</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Dev Mode</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        <UnifiedDashboard mode="executive" />
      </div>
    </div>
  )
}