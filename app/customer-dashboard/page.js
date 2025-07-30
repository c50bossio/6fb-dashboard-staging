'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingIntelligence from '../../components/BookingIntelligence'

export default function CustomerDashboardPage() {
  const [user, setUser] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    const token = localStorage.getItem('customer_token')
    const userData = localStorage.getItem('customer_user')

    if (!token || !userData) {
      router.push('/customer-auth')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUser(user)
      await loadAppointments(token)
    } catch (error) {
      console.error('Error loading user data:', error)
      localStorage.removeItem('customer_token')
      localStorage.removeItem('customer_user')
      router.push('/customer-auth')
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('customer_token')
    localStorage.removeItem('customer_user')
    router.push('/')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">Manage your appointments and preferences</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
            </div>
            {user?.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/book')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              📅 Book New Appointment
            </button>
            <button
              onClick={() => alert('Google Calendar sync coming soon!')}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              📱 Sync with Google Calendar
            </button>
            <button
              onClick={() => alert('Profile settings coming soon!')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              ⚙️ Update Profile
            </button>
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Appointments</h2>
          
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
              <p className="text-gray-600 mb-4">Book your first appointment to get started</p>
              <button
                onClick={() => router.push('/book')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment, index) => (
                <div key={appointment.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{appointment.service_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📍 {appointment.barbershop_name}</p>
                        <p>💇‍♂️ with {appointment.barber_name}</p>
                        <p>📅 {formatDate(appointment.scheduled_at)} at {formatTime(appointment.scheduled_at)}</p>
                        <p>⏱️ {appointment.duration_minutes} minutes</p>
                        <p>💰 ${appointment.total_amount}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {appointment.status?.toLowerCase() === 'confirmed' && (
                        <button
                          onClick={() => alert('Appointment management coming soon!')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Intelligence */}
        <div className="mt-8">
          <BookingIntelligence customerId={user?.id} />
        </div>

        {/* Benefits */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Account Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">✅</span>
              <span className="text-blue-800">Track all your appointments</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">✅</span>
              <span className="text-blue-800">Pre-filled booking information</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">✅</span>
              <span className="text-blue-800">Smart booking recommendations</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">✅</span>
              <span className="text-blue-800">Personalized rebooking suggestions</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">✅</span>
              <span className="text-blue-800">Booking analytics and insights</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⏳</span>
              <span className="text-blue-800">Google Calendar sync (coming soon)</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⏳</span>
              <span className="text-blue-800">Loyalty rewards (coming soon)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}