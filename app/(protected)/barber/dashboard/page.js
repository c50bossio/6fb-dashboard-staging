'use client'

import { 
  CalendarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  BellIcon,
  ScissorsIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import ComponentErrorBoundary from '../../../../components/dashboard/ComponentErrorBoundary'
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
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get barbershop context from profile
      const barbershopId = profile?.shop_id || profile?.barbershop_id
      const barberId = user?.id
      
      if (!barberId) {
        throw new Error('No user ID available')
      }

      if (!barbershopId) {
        // For barbers without barbershop association, show helpful error
        if (profile?.role === 'BARBER') {
          setError('Your barber account is not associated with a barbershop. Please contact your shop owner to complete your profile setup.')
        } else {
          setError('No barbershop association found. Please complete your profile setup.')
        }
        setLoading(false)
        return
      }
      
      // Build API URL with both barber_id and barbershop_id for proper authorization
      const apiUrl = `/api/appointments?barber_id=${barberId}&barbershop_id=${barbershopId}`
      console.log('Fetching appointments from:', apiUrl)
      
      const appointmentsRes = await fetch(apiUrl)
      
      if (!appointmentsRes.ok) {
        if (appointmentsRes.status === 500) {
          throw new Error(`Server error (${appointmentsRes.status}): Failed to load appointments. This may be a database or configuration issue.`)
        } else if (appointmentsRes.status === 401) {
          throw new Error('Authentication failed. Please sign in again.')
        } else if (appointmentsRes.status === 403) {
          throw new Error('Access denied. You may not have permission to view these appointments.')
        } else {
          throw new Error(`Failed to load appointments (${appointmentsRes.status})`)
        }
      }
      
      const appointmentsData = await appointmentsRes.json()
      
      if (appointmentsData.error) {
        throw new Error(appointmentsData.error)
      }
      
      if (appointmentsData.bookings || appointmentsData.appointments) {
        // Handle both 'bookings' and 'appointments' response formats
        const appointmentsList = appointmentsData.bookings || appointmentsData.appointments || []
        const today = new Date().toDateString()
        const todayAppointments = appointmentsList.filter(apt => 
          new Date(apt.scheduled_at).toDateString() === today
        )
        
        setAppointments(todayAppointments)
        
        const completed = todayAppointments.filter(apt => apt.status === 'COMPLETED' || apt.status === 'completed').length
        const upcoming = todayAppointments.filter(apt => apt.status === 'CONFIRMED' || apt.status === 'confirmed').length
        const cancelled = todayAppointments.filter(apt => apt.status === 'CANCELLED' || apt.status === 'cancelled').length
        
        const todayEarnings = todayAppointments
          .filter(apt => apt.status === 'COMPLETED' || apt.status === 'completed')
          .reduce((total, apt) => total + (apt.service_price || apt.total_amount || 0), 0)
        const weekEarnings = todayEarnings * 7 // Estimate weekly from daily
        const monthEarnings = weekEarnings * 4 // Estimate monthly from weekly
        
        setStats({
          todayAppointments: todayAppointments.length,
          completedToday: completed,
          upcomingToday: upcoming,
          todayEarnings,
          weekEarnings,
          monthEarnings,
          cancelledToday: cancelled,
          newClients: todayAppointments.filter(apt => apt.is_new_client || apt.client?.is_new).length
        })

        // Clear retry count on success
        setRetryCount(0)
      } else {
        console.warn('No appointments data in response:', appointmentsData)
        setAppointments([])
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError(error.message || 'Failed to load dashboard data')
      
      // Increment retry count
      setRetryCount(prev => prev + 1)
      
      // Auto-retry once after a delay if it's a network error
      if (retryCount === 0 && (error.message.includes('500') || error.message.includes('Network'))) {
        console.log('Auto-retrying in 3 seconds...')
        setTimeout(() => {
          loadDashboardData()
        }, 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 sm:order-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-dark-text-secondary truncate">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5 sm:mt-1 hidden sm:block">{subtitle}</p>
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
      confirmed: { bg: 'bg-olive-100', text: 'text-olive-800', label: 'Confirmed' },
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-bg-elevated-1 shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Barber Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">Welcome back, {profile?.full_name || user?.email || 'Barber'}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-3">
              <button className="relative p-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:text-dark-text-primary">
                <BellIcon className="h-5 sm:h-6 w-5 sm:w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
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
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Dashboard Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
                {retryCount < 3 && (
                  <button
                    onClick={loadDashboardData}
                    disabled={loading}
                    className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Retry Loading
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Grid */}
        <ComponentErrorBoundary componentName="Dashboard Stats">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <StatCard
              icon={CalendarIcon}
              title="Today's Appointments"
              value={stats.todayAppointments}
              color="text-olive-600"
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
              color="text-amber-700"
              subtitle="Before commission"
            />
            <StatCard
              icon={UserGroupIcon}
              title="New Clients"
              value={stats.newClients}
              color="text-gold-600"
              subtitle="This week"
            />
          </div>
        </ComponentErrorBoundary>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/barber/schedule" className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:bg-amber-900/30 transition-colors text-center">
              <CalendarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-amber-700 dark:text-amber-300 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-dark-text-primary">View Schedule</p>
            </Link>
            <Link href="/barber/clients" className="p-3 sm:p-4 bg-olive-50 dark:bg-dark-brand-olive/10 rounded-lg hover:bg-olive-100 dark:bg-dark-brand-olive/20 transition-colors text-center">
              <UserGroupIcon className="h-5 sm:h-6 w-5 sm:w-6 text-olive-600 dark:text-dark-brand-olive mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-dark-text-primary">My Clients</p>
            </Link>
            <Link href="/barber/reports" className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:bg-green-900/30 transition-colors text-center">
              <ChartBarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-600 dark:text-green-400 mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-dark-text-primary">View Reports</p>
            </Link>
            <Link href="/barber/services" className="p-3 sm:p-4 bg-gold-50 dark:bg-dark-brand-gold/10 rounded-lg hover:bg-gold-100 dark:bg-dark-brand-gold/20 transition-colors text-center">
              <ScissorsIcon className="h-5 sm:h-6 w-5 sm:w-6 text-gold-600 dark:text-dark-brand-gold mx-auto mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-dark-text-primary">My Services</p>
            </Link>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-bg-elevated-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Today's Schedule</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-bg-elevated-2 dark:bg-dark-bg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <UserGroupIcon className="h-5 w-5 text-gray-600 dark:text-dark-text-secondary" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                          {appointment.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                          {appointment.service_name} • {appointment.start_time} - {appointment.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(appointment.status)}
                      <button className="text-sm text-olive-600 dark:text-dark-brand-olive hover:text-olive-800 font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-text-disabled" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-dark-text-primary">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-muted">
                  Enjoy your day off or check tomorrow's schedule
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6 p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2">This Week</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">${stats.weekEarnings}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 12% from last week</p>
          </div>
          <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6 p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2">This Month</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">${stats.monthEarnings}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 8% from last month</p>
          </div>
          <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-xl shadow-sm border border-gray-200 dark:border-dark-bg-elevated-6 p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2">Commission Rate</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">60%</p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">Standard rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}