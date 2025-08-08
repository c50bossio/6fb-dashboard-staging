'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BarberDashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    todayAppointments: 0,
    completedToday: 0,
    upcomingToday: 0,
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    cancelledToday: 0,
    newClients: 0
  })
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load today's appointments
      const appointmentsRes = await fetch('/api/appointments?barber_id=' + (user?.id || 'demo'))
      const appointmentsData = await appointmentsRes.json()
      
      if (appointmentsData.appointments) {
        const today = new Date().toDateString()
        const todayAppointments = appointmentsData.appointments.filter(apt => 
          new Date(apt.appointment_date).toDateString() === today
        )
        
        setAppointments(todayAppointments)
        
        // Calculate stats
        const completed = todayAppointments.filter(apt => apt.status === 'completed').length
        const upcoming = todayAppointments.filter(apt => apt.status === 'confirmed').length
        const cancelled = todayAppointments.filter(apt => apt.status === 'cancelled').length
        
        // Calculate earnings (mock data)
        const todayEarnings = completed * 45
        const weekEarnings = todayEarnings * 5
        const monthEarnings = weekEarnings * 4
        
        setStats({
          todayAppointments: todayAppointments.length,
          completedToday: completed,
          upcomingToday: upcoming,
          todayEarnings,
          weekEarnings,
          monthEarnings,
          cancelledToday: cancelled,
          newClients: Math.floor(Math.random() * 5) + 1
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 sm:order-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} mb-2 sm:mb-0 order-1 sm:order-2 self-start sm:self-auto`}>
          <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${color}`} />
        </div>
      </div>
    </div>
  )

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'No Show' }
    }
    
    const config = statusConfig[status] || statusConfig.confirmed
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Barber Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600">Welcome back, {profile?.full_name || user?.email || 'Barber'}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-3">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <BellIcon className="h-5 sm:h-6 w-5 sm:w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              <div className="text-xs sm:text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={CalendarIcon}
            title="Today's Appointments"
            value={stats.todayAppointments}
            color="text-blue-600"
            subtitle={`${stats.upcomingToday} upcoming`}
          />
          <StatCard
            icon={CheckCircleIcon}
            title="Completed Today"
            value={stats.completedToday}
            color="text-green-600"
            subtitle={`${stats.cancelledToday} cancelled`}
          />
          <StatCard
            icon={CurrencyDollarIcon}
            title="Today's Earnings"
            value={`$${stats.todayEarnings}`}
            color="text-amber-600"
            subtitle="Before commission"
          />
          <StatCard
            icon={UserGroupIcon}
            title="New Clients"
            value={stats.newClients}
            color="text-purple-600"
            subtitle="This week"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button className="p-3 sm:p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
              <CalendarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-amber-600 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">View Schedule</p>
            </button>
            <button className="p-3 sm:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <UserGroupIcon className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">My Clients</p>
            </button>
            <button className="p-3 sm:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <ChartBarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-600 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">View Reports</p>
            </button>
            <button className="p-3 sm:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <ClockIcon className="h-5 sm:h-6 w-5 sm:w-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900">Set Availability</p>
            </button>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <UserGroupIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.customer_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.service_name} • {appointment.start_time} - {appointment.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(appointment.status)}
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enjoy your day off or check tomorrow's schedule
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">This Week</h3>
            <p className="text-2xl font-bold text-gray-900">${stats.weekEarnings}</p>
            <p className="text-xs text-green-600 mt-1">↑ 12% from last week</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
            <p className="text-2xl font-bold text-gray-900">${stats.monthEarnings}</p>
            <p className="text-xs text-green-600 mt-1">↑ 8% from last month</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Commission Rate</h3>
            <p className="text-2xl font-bold text-gray-900">60%</p>
            <p className="text-xs text-gray-500 mt-1">Standard rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}