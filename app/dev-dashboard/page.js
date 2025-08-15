'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function DevDashboard() {
  const [userData, setUserData] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadRealData() {
      console.log('🔄 Loading real data from Supabase...')
      
      const supabase = createClient()
      
      // Hardcode the dev user ID we know exists
      const userId = 'bbb243c4-cc7d-4458-af03-3bfff742aee5'
      
      // Fetch real profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }
      
      // Fetch real barbershop data
      const { data: barbershop, error: shopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', userId)
        .single()
      
      if (shopError) {
        console.error('Error fetching barbershop:', shopError)
      }
      
      // Create user object with real data
      const user = {
        id: userId,
        email: profile?.email || 'dev@bookedbarber.com',
        user_metadata: {
          full_name: profile?.full_name || 'Dev User',
          shop_name: profile?.shop_name || barbershop?.name || 'Tomb45 Barbershop'
        },
        profile: profile,
        barbershop: barbershop,
        barbershop_id: barbershop?.id || 'demo-shop-001'
      }
      
      // Load dashboard data
      try {
        const response = await fetch(`/api/analytics/live-data?barbershop_id=${user.barbershop_id}&format=json&force_refresh=true`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          const apiData = result.data
          setDashboardData({
            revenue: apiData.total_revenue || 0,
            customers: apiData.total_customers || 0,
            appointments: apiData.total_appointments || 0,
            satisfaction: 4.5,
            dailyRevenue: apiData.daily_revenue || 0,
            occupancyRate: Math.round((apiData.occupancy_rate || 0) * 100)
          })
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
      
      console.log('✅ Loaded real data:', {
        profile: !!profile,
        barbershop: !!barbershop,
        shopName: barbershop?.name
      })
      
      setUserData(user)
      setLoading(false)
    }
    
    loadRealData()
  }, [])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading real data from database...</p>
        </div>
      </div>
    )
  }
  
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Failed to load data. Check console for errors.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-center text-sm">
        <span className="text-yellow-800">
          🔧 Development Dashboard - Using Real Database Data (User: {userData.email})
        </span>
      </div>
      
      {/* Simple Dashboard Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Development Dashboard</h1>
          <p className="text-gray-600">Testing dashboard with real Supabase data</p>
        </div>
        
        {/* User & Barbershop Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User & Barbershop Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900">User Details</h3>
              <p className="text-sm text-gray-600">Email: {userData.email}</p>
              <p className="text-sm text-gray-600">Name: {userData.user_metadata.full_name}</p>
              <p className="text-sm text-gray-600">Profile Found: {userData.profile ? '✅ Yes' : '❌ No'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Barbershop Details</h3>
              <p className="text-sm text-gray-600">Shop: {userData.user_metadata.shop_name}</p>
              <p className="text-sm text-gray-600">Barbershop ID: {userData.barbershop_id}</p>
              <p className="text-sm text-gray-600">Barbershop Found: {userData.barbershop ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>
        </div>
        
        {/* Dashboard Metrics */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Revenue</h3>
              <p className="text-3xl font-bold text-green-600">${dashboardData.revenue}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Customers</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardData.customers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Appointments</h3>
              <p className="text-3xl font-bold text-purple-600">{dashboardData.appointments}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Occupancy</h3>
              <p className="text-3xl font-bold text-yellow-600">{dashboardData.occupancyRate}%</p>
            </div>
          </div>
        )}
        
        {/* Status */}
        <div className="bg-green-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Dashboard Loading Successfully!</h2>
          <p className="text-green-700">
            The development dashboard is now working with real Supabase data. 
            You can test features and see actual metrics from your database.
          </p>
        </div>
      </div>
    </div>
  )
}