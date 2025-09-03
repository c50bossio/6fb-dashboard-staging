'use client'

import {
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function WalkInStatusPage({ params }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { appointmentId } = params

  // Fetch walk-in status
  const fetchStatus = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      setError('')

      const response = await fetch(`/api/walk-ins/status/${appointmentId}`)
      const result = await response.json()

      if (result.success) {
        setStatus(result.appointment)
      } else {
        setError(result.error || 'Failed to load status')
      }
    } catch (error) {
      console.error('Error fetching walk-in status:', error)
      setError('Failed to load status. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load status on mount
  useEffect(() => {
    if (appointmentId) {
      fetchStatus()
    }
  }, [appointmentId])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchStatus(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [loading, refreshing])

  const getStatusInfo = (status) => {
    switch (status?.status) {
      case 'WALK_IN_WAITING':
        return {
          color: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: ClockIcon,
          title: 'Waiting in Queue',
          description: 'You\'re in line! We\'ll text you when you\'re next.'
        }
      case 'IN_SERVICE':
        return {
          color: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: UserGroupIcon,
          title: 'Service Started',
          description: 'Your service has begun! Please head to the shop.'
        }
      case 'completed':
        return {
          color: 'bg-green-50 text-green-800 border-green-200',
          icon: CheckCircleIcon,
          title: 'Service Complete',
          description: 'Thank you for visiting! Hope you love your new look.'
        }
      default:
        return {
          color: 'bg-gray-50 text-gray-800 border-gray-200',
          icon: ClockIcon,
          title: 'Unknown Status',
          description: 'Unable to determine current status.'
        }
    }
  }

  const formatTime = (timeString) => {
    try {
      const date = new Date(`2000-01-01 ${timeString}`)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeString
    }
  }

  // Smart wait time now calculated by the API based on service type and active barbers

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Loading your status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Status</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchStatus()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No Status Found</h1>
          <p className="text-gray-600">We couldn't find information for this appointment.</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(status)
  const StatusIcon = statusInfo.icon
  const estimatedWait = status.estimated_wait_minutes || 30 // Fallback to 30 if not provided

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Walk-In Status</h1>
          <p className="text-gray-600">Real-time updates for your queue position</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mb-4 ${statusInfo.color}`}>
            <StatusIcon className="h-4 w-4 mr-2" />
            {statusInfo.title}
          </div>

          {/* Customer Info */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{status.customer_name}</h2>
            <p className="text-gray-600">Service: {status.service_name}</p>
            <p className="text-gray-500 text-sm">Checked in at {formatTime(status.time)}</p>
          </div>

          {/* Queue Information */}
          {status.status === 'WALK_IN_WAITING' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">#{status.queue_position || 1}</p>
                <p className="text-sm text-orange-700">Position in Line</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{estimatedWait}m</p>
                <p className="text-sm text-blue-700">Smart Estimate</p>
                {status.active_barbers && (
                  <p className="text-xs text-blue-600 mt-1">{status.active_barbers} barber{status.active_barbers > 1 ? 's' : ''} working</p>
                )}
              </div>
            </div>
          )}

          {/* Service Information */}
          {status.service_duration && status.status === 'WALK_IN_WAITING' && (
            <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                {status.service_name} typically takes {status.service_duration} minutes
              </p>
            </div>
          )}

          {/* Status Description */}
          <p className="text-gray-600 text-center">{statusInfo.description}</p>
        </div>

        {/* Barbershop Info */}
        {status.barbershop && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Barbershop Information</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4 mr-2" />
                {status.barbershop.name}
              </div>
              {status.barbershop.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  <a href={`tel:${status.barbershop.phone}`} className="text-blue-600 hover:text-blue-800">
                    {status.barbershop.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
          <p className="text-xs text-gray-500 mt-2">Auto-updates every 30 seconds</p>
        </div>

        {/* Notes */}
        {status.status === 'WALK_IN_WAITING' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• We'll send you a text when you're almost ready</p>
              <p>• Please stay within 10 minutes of the shop</p>
              <p>• If you need to leave, call the shop to hold your spot</p>
              {status.active_barbers > 1 && (
                <p>• Multiple barbers are working to serve you faster</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}