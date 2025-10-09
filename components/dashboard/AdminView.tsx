/**
 * Admin Dashboard View
 * Feature: 011-holistic-staff-management
 *
 * Shows admins ALL bookings and full management features
 * Implements RBAC with admin-level access
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { format, startOfDay, endOfDay } from 'date-fns'

interface DashboardStats {
  todayRevenue: number
  todayBookings: number
  activeStaff: number
  completionRate: number
}

interface RecentBooking {
  id: string
  scheduled_at: string
  customer_name: string
  status: string
  total_amount_cents: number
  barber: {
    name: string
  }
  service: {
    name: string
  }
}

interface AdminViewProps {
  barbershopId?: string
  userName?: string
}

export default function AdminView({ barbershopId, userName }: AdminViewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayBookings: 0,
    activeStaff: 0,
    completionRate: 0
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [barbershopId])

  async function loadAdminData() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Today's date range
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      // Fetch today's bookings
      const { data: todayBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_at,
          status,
          customer_name,
          total_amount_cents,
          barber:profiles!bookings_barber_id_fkey(name),
          service:services(name)
        `)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .order('scheduled_at', { ascending: false })

      if (bookingsError) throw bookingsError

      const bookings = todayBookings as RecentBooking[]

      // Calculate stats
      const revenue = bookings.reduce((sum, b) => sum + (b.total_amount_cents || 0), 0) / 100
      const completedCount = bookings.filter(b => b.status === 'COMPLETED').length
      const completionRate = bookings.length > 0 ? (completedCount / bookings.length) * 100 : 0

      // Fetch active staff count
      const { count: staffCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'BARBER')

      setStats({
        todayRevenue: revenue,
        todayBookings: bookings.length,
        activeStaff: staffCount || 0,
        completionRate: Math.round(completionRate)
      })

      setRecentBookings(bookings.slice(0, 5))
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-muted text-green-800'
      case 'PENDING':
        return 'bg-muted text-yellow-800'
      case 'COMPLETED':
        return 'bg-muted text-blue-800'
      case 'CANCELLED':
        return 'bg-muted text-red-800'
      default:
        return 'bg-muted text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-purple-100">Complete business overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.todayRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
            </div>
            <div className="p-3 bg-muted rounded-full">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStaff}</p>
            </div>
            <div className="p-3 bg-muted rounded-full">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
            </div>
            <div className="p-3 bg-muted rounded-full">
              <CheckCircleIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
          <a
            href="/dashboard/calendar"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </a>
        </div>
        <div className="divide-y divide-border">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No bookings today</p>
            </div>
          ) : (
            recentBookings.map((booking) => (
              <div key={booking.id} className="p-6 hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{booking.customer_name}</h4>
                        <p className="text-sm text-gray-600">
                          {booking.service.name} • {booking.barber.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {format(new Date(booking.scheduled_at), 'h:mm a')}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                    <p className="font-semibold text-green-600 min-w-[80px] text-right">
                      ${(booking.total_amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/dashboard/staff"
          className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <UserGroupIcon className="h-6 w-6 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Manage Staff</h4>
          </div>
          <p className="text-sm text-gray-600">Add barbers, set schedules, manage availability</p>
        </a>

        <a
          href="/dashboard/analytics-enhanced"
          className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <ChartBarIcon className="h-6 w-6 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Analytics</h4>
          </div>
          <p className="text-sm text-gray-600">View detailed performance reports</p>
        </a>

        <a
          href="/dashboard/calendar"
          className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <CalendarIcon className="h-6 w-6 text-green-600" />
            <h4 className="font-semibold text-gray-900">Full Calendar</h4>
          </div>
          <p className="text-sm text-gray-600">Manage all bookings and schedules</p>
        </a>
      </div>
    </div>
  )
}
