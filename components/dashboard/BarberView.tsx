/**
 * Barber Dashboard View
 * Feature: 011-holistic-staff-management
 *
 * Shows barbers ONLY their own bookings, commissions, and editable profile fields
 * Implements RBAC client-side filtering (server enforces via RLS)
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarIcon, CurrencyDollarIcon, UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format, addDays } from 'date-fns'

interface Booking {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  customer_name: string
  customer_phone: string
  total_amount_cents: number
  service: {
    name: string
    price_cents: number
  }
}

interface BarberViewProps {
  userId: string
  userName?: string
}

export default function BarberView({ userId, userName }: BarberViewProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBarberData()
  }, [userId])

  async function loadBarberData() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch barber's bookings (RLS policy ensures only their own)
      const today = new Date().toISOString()
      const weekAhead = addDays(new Date(), 7).toISOString()

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          status,
          customer_name,
          customer_phone,
          total_amount_cents,
          service:services(name, price_cents)
        `)
        .eq('barber_id', userId)
        .gte('scheduled_at', today)
        .lte('scheduled_at', weekAhead)
        .in('status', ['CONFIRMED', 'PENDING'])
        .order('scheduled_at', { ascending: true })

      if (error) throw error

      const bookings = data as Booking[]
      setBookings(bookings)

      // Calculate today's earnings
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const todayEnd = new Date().setHours(23, 59, 59, 999)
      const todayBookings = bookings.filter(b => {
        const bookingTime = new Date(b.scheduled_at).getTime()
        return bookingTime >= todayStart && bookingTime <= todayEnd
      })
      const earnings = todayBookings.reduce((sum, b) => sum + b.total_amount_cents, 0)
      setTodayEarnings(earnings / 100)

      setUpcomingCount(bookings.length)
    } catch (error) {
      console.error('Error loading barber data:', error)
    } finally {
      setLoading(false)
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {userName || 'Barber'}!</h2>
        <p className="text-blue-100">Here's your schedule overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${todayEarnings.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming This Week</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next Appointment</p>
              <p className="text-sm font-bold text-gray-900">
                {bookings.length > 0
                  ? format(new Date(bookings[0].scheduled_at), 'h:mm a')
                  : 'No appointments'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Upcoming Appointments</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <UserCircleIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{booking.customer_name}</h4>
                        <p className="text-sm text-gray-600">{booking.service.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {format(new Date(booking.scheduled_at), 'EEE, MMM d')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(booking.scheduled_at), 'h:mm a')}
                    </p>
                  </div>
                  <div className="ml-6 text-right">
                    <p className="font-semibold text-green-600">
                      ${(booking.total_amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{booking.duration_minutes} min</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/dashboard/calendar"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CalendarIcon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">View Full Calendar</p>
              <p className="text-sm text-gray-600">See all your bookings</p>
            </div>
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCircleIcon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-600">Update your bio and photo</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
