'use client'

import {
  ClockIcon,
  CalendarDaysIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid
} from '@heroicons/react/24/solid'
import { useState, useEffect, useMemo } from 'react'
import { format, startOfDay, endOfDay, addMinutes, differenceInMinutes } from 'date-fns'

export default function TodaysSchedule({ barbershopId, data }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [checkingInCustomer, setCheckingInCustomer] = useState(null)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Load today's appointments
  useEffect(() => {
    loadTodaysAppointments()
    
    // Auto-refresh every 2 minutes for real-time updates
    const interval = setInterval(loadTodaysAppointments, 120000)
    return () => clearInterval(interval)
  }, [barbershopId, selectedDate])

  const loadTodaysAppointments = async () => {
    if (!barbershopId) return
    
    try {
      setError(null)
      if (!loading) setRefreshing(true)

      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/appointments?barbershop_id=${barbershopId}&date=${dateStr}&include_details=true`)
      
      if (!response.ok) {
        throw new Error('Failed to load appointments')
      }
      
      const result = await response.json()
      
      if (result.success && result.appointments) {
        // Sort by time and add status enrichment
        const enrichedAppointments = result.appointments
          .map(apt => ({
            ...apt,
            start_time: new Date(`${apt.date} ${apt.start_time}`),
            end_time: new Date(`${apt.date} ${apt.end_time || addMinutes(new Date(`${apt.date} ${apt.start_time}`), apt.duration_minutes || 30)}`),
            status: apt.status || 'confirmed',
            is_past: new Date(`${apt.date} ${apt.start_time}`) < new Date(),
            is_current: isAppointmentCurrent(apt),
            estimated_revenue: parseFloat(apt.service_price || 0)
          }))
          .sort((a, b) => a.start_time - b.start_time)

        setAppointments(enrichedAppointments)
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error loading today\'s appointments:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const isAppointmentCurrent = (appointment) => {
    const now = new Date()
    const start = new Date(`${appointment.date} ${appointment.start_time}`)
    const end = new Date(`${appointment.date} ${appointment.end_time || addMinutes(start, appointment.duration_minutes || 30)}`)
    return now >= start && now <= end
  }

  // Calculate daily metrics
  const dailyMetrics = useMemo(() => {
    const confirmed = appointments.filter(apt => apt.status === 'confirmed' || apt.status === 'checked_in')
    const completed = appointments.filter(apt => apt.status === 'completed')
    const pending = appointments.filter(apt => apt.status === 'pending')
    const cancelled = appointments.filter(apt => apt.status === 'cancelled')
    const current = appointments.filter(apt => apt.is_current)

    const totalRevenue = completed.reduce((sum, apt) => sum + (apt.estimated_revenue || 0), 0)
    const projectedRevenue = confirmed.reduce((sum, apt) => sum + (apt.estimated_revenue || 0), 0)

    return {
      total: appointments.length,
      confirmed: confirmed.length,
      completed: completed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      current: current.length,
      totalRevenue,
      projectedRevenue,
      completionRate: appointments.length > 0 ? Math.round((completed.length / appointments.length) * 100) : 0,
      occupancyHours: appointments.reduce((sum, apt) => sum + (apt.duration_minutes || 30), 0) / 60
    }
  }, [appointments])

  const handleCustomerCheckIn = async (appointmentId) => {
    setCheckingInCustomer(appointmentId)
    
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to check in customer')
      }
      
      const result = await response.json()
      if (result.success) {
        // Update local state
        setAppointments(appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'checked_in', checked_in_at: new Date().toISOString() }
            : apt
        ))
      }
    } catch (error) {
      console.error('Check-in failed:', error)
      alert('Failed to check in customer. Please try again.')
    } finally {
      setCheckingInCustomer(null)
    }
  }

  const handleAppointmentComplete = async (appointmentId) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete appointment')
      }
      
      const result = await response.json()
      if (result.success) {
        // Update local state
        setAppointments(appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'completed', completed_at: new Date().toISOString() }
            : apt
        ))
      }
    } catch (error) {
      console.error('Complete appointment failed:', error)
      alert('Failed to complete appointment. Please try again.')
    }
  }

  const getNextAppointment = () => {
    const now = new Date()
    return appointments.find(apt => {
      const appointmentTime = new Date(apt.date || apt.scheduled_at);
      return appointmentTime > now && apt.status !== 'cancelled';
    })
  }

  const getCurrentAppointment = () => {
    return appointments.find(apt => apt.is_current && apt.status !== 'cancelled')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading today's schedule...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Failed to load schedule</p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
          <button
            onClick={loadTodaysAppointments}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Daily Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <CalendarDaysIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-600">Today's Appointments</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{dailyMetrics.confirmed}</p>
            <p className="text-xs text-gray-500">{dailyMetrics.total} total</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <CheckCircleSolid className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{dailyMetrics.completed}</p>
            <p className="text-xs text-gray-500">{dailyMetrics.completionRate}% rate</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-600">Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              ${Math.round(dailyMetrics.totalRevenue)}
            </p>
            <p className="text-xs text-gray-500">
              ${Math.round(dailyMetrics.projectedRevenue)} projected
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <ClockSolid className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${dailyMetrics.current > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-xs sm:text-sm font-medium text-gray-600">Current Status</p>
            {dailyMetrics.current > 0 ? (
              <>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">Active</p>
                <p className="text-xs text-gray-500">{dailyMetrics.current} in progress</p>
              </>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-bold text-gray-600">Available</p>
                <p className="text-xs text-gray-500">Ready for walk-ins</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Current Appointment Alert */}
      {(() => {
        const currentApt = getCurrentAppointment()
        const nextApt = getNextAppointment()
        
        if (currentApt) {
          return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Current Appointment</h3>
                    <p className="text-blue-700">
                      {currentApt.client_name || currentApt.client?.full_name || 'Walk-in'} • {currentApt.service?.name || currentApt.service_name} •
                      {format(currentApt.start_time, 'h:mm a')} - {format(currentApt.end_time, 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAppointmentComplete(currentApt.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          )
        } else if (nextApt) {
          const minutesUntilNext = differenceInMinutes(nextApt.start_time, new Date())
          return (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Next Appointment</h3>
                    <p className="text-amber-700">
                      {nextApt.client_name || nextApt.client?.full_name || 'Walk-in'} in {minutesUntilNext} minutes • {nextApt.service?.name || nextApt.service_name}
                    </p>
                  </div>
                </div>
                {minutesUntilNext <= 15 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCustomerCheckIn(nextApt.id)}
                      disabled={checkingInCustomer === nextApt.id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {checkingInCustomer === nextApt.id ? 'Checking In...' : 'Check In'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        } else {
          return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">All Clear</h3>
                    <p className="text-green-700">No upcoming appointments • Ready for walk-ins</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWalkInModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  + Walk-In
                </button>
              </div>
            </div>
          )
        }
      })()}

      {/* Appointments Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDaysIcon className="h-6 w-6 text-blue-500" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {dailyMetrics.occupancyHours.toFixed(1)} hours scheduled
              </span>
              <button
                onClick={loadTodaysAppointments}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh schedule"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
              <p className="text-gray-600 mb-6">This is a great time for walk-ins or personal tasks</p>
              <button
                onClick={() => setShowWalkInModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Walk-In
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {appointments.map((appointment, index) => (
                <AppointmentRow 
                  key={appointment.id} 
                  appointment={appointment}
                  onCheckIn={handleCustomerCheckIn}
                  onComplete={handleAppointmentComplete}
                  checkingIn={checkingInCustomer === appointment.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const AppointmentRow = ({ appointment, onCheckIn, onComplete, checkingIn }) => {
  const getStatusConfig = (status, isPast, isCurrent) => {
    if (isCurrent) {
      return {
        bg: 'bg-blue-50 border-blue-200',
        dot: 'bg-blue-500',
        text: 'text-blue-900',
        badge: 'bg-blue-100 text-blue-800',
        badgeText: 'In Progress'
      }
    }
    
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-50 border-green-200',
          dot: 'bg-green-500',
          text: 'text-green-900',
          badge: 'bg-green-100 text-green-800',
          badgeText: 'Completed'
        }
      case 'checked_in':
        return {
          bg: 'bg-indigo-50 border-indigo-200',
          dot: 'bg-indigo-500',
          text: 'text-indigo-900',
          badge: 'bg-indigo-100 text-indigo-800',
          badgeText: 'Checked In'
        }
      case 'cancelled':
        return {
          bg: 'bg-red-50 border-red-200',
          dot: 'bg-red-500',
          text: 'text-red-900',
          badge: 'bg-red-100 text-red-800',
          badgeText: 'Cancelled'
        }
      case 'pending':
        return {
          bg: 'bg-amber-50 border-amber-200',
          dot: 'bg-amber-500',
          text: 'text-amber-900',
          badge: 'bg-amber-100 text-amber-800',
          badgeText: 'Pending'
        }
      default:
        if (isPast) {
          return {
            bg: 'bg-gray-50 border-gray-200',
            dot: 'bg-gray-400',
            text: 'text-gray-600',
            badge: 'bg-gray-100 text-gray-800',
            badgeText: 'Missed'
          }
        }
        return {
          bg: 'bg-white border-gray-200',
          dot: 'bg-green-500',
          text: 'text-gray-900',
          badge: 'bg-green-100 text-green-800',
          badgeText: 'Confirmed'
        }
    }
  }

  const statusConfig = getStatusConfig(appointment.status, appointment.is_past, appointment.is_current)
  const canCheckIn = appointment.status === 'confirmed' && !appointment.is_past
  const canComplete = appointment.status === 'checked_in' || appointment.is_current
  const showActions = canCheckIn || canComplete

  return (
    <div className={`p-4 rounded-lg border ${statusConfig.bg} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Time */}
          <div className="text-center min-w-0">
            <div className="font-bold text-gray-900">
              {format(appointment.start_time, 'h:mm')}
            </div>
            <div className="text-xs text-gray-500">
              {format(appointment.start_time, 'a')}
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`w-3 h-3 rounded-full ${statusConfig.dot} flex-shrink-0`} />

          {/* Appointment Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium truncate ${statusConfig.text}`}>
                {appointment.client_name || appointment.client?.full_name || 'Walk-in Customer'}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.badge} flex-shrink-0`}>
                {statusConfig.badgeText}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                {appointment.barber?.full_name || appointment.barber_name || 'Unassigned'}
              </span>
              <span className="truncate">
                {appointment.service?.name || appointment.service_name || 'General Service'}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {appointment.duration_minutes || 30}m
              </span>
              {appointment.estimated_revenue > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  ${appointment.estimated_revenue}
                </span>
              )}
            </div>

            {/* Client Contact Info */}
            {(appointment.client_phone || appointment.client?.phone || appointment.client_email || appointment.client?.email) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {(appointment.client_phone || appointment.client?.phone) && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" />
                    {appointment.client_phone || appointment.client?.phone}
                  </span>
                )}
                {(appointment.client_email || appointment.client?.email) && (
                  <span className="truncate">
                    {appointment.client_email || appointment.client?.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-2 ml-4">
            {canCheckIn && (
              <button
                onClick={() => onCheckIn(appointment.id)}
                disabled={checkingIn}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {checkingIn ? 'Checking In...' : 'Check In'}
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => onComplete(appointment.id)}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => window.open(`tel:${appointment.client_phone || appointment.client?.phone}`, '_self')}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Call client"
              disabled={!appointment.client_phone && !appointment.client?.phone}
            >
              <PhoneIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.open(`sms:${appointment.client_phone || appointment.client?.phone}`, '_self')}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="Text client"
              disabled={!appointment.client_phone && !appointment.client?.phone}
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}