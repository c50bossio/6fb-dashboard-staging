'use client'

import { useAuth } from '../../../components/SupabaseAuthProvider'
import { useState, useEffect } from 'react'
import {
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhoneIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function WalkInQueuePage() {
  const { user, profile, loading } = useAuth()
  const [walkIns, setWalkIns] = useState([])
  const [barbershopId, setBarbershopId] = useState(null)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  // Get barbershop ID from user profile
  useEffect(() => {
    if (profile) {
      const shopId = profile.shop_id || profile.barbershop_id
      setBarbershopId(shopId)
    }
  }, [profile])

  // Load walk-in queue
  const loadWalkInQueue = async () => {
    if (!barbershopId) return

    try {
      setLoadingQueue(true)
      setError('')

      const response = await fetch(`/api/walk-ins?barbershop_id=${barbershopId}`)
      const result = await response.json()

      if (result.success) {
        setWalkIns(result.walk_ins || [])
      } else {
        setError(result.error || 'Failed to load walk-in queue')
      }
    } catch (error) {
      console.error('Error loading walk-in queue:', error)
      setError('Failed to load walk-in queue')
    } finally {
      setLoadingQueue(false)
    }
  }

  // Load queue on mount and when barbershopId changes
  useEffect(() => {
    if (barbershopId) {
      loadWalkInQueue()
      // Refresh every 30 seconds
      const interval = setInterval(loadWalkInQueue, 30000)
      return () => clearInterval(interval)
    }
  }, [barbershopId])

  // Handle customer service completion
  const handleCompleteService = async (appointmentId) => {
    try {
      setProcessingId(appointmentId)
      setError('')

      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        // Remove from queue
        setWalkIns(prev => prev.filter(w => w.id !== appointmentId))
      } else {
        setError(result.error || 'Failed to complete service')
      }
    } catch (error) {
      console.error('Complete service error:', error)
      setError('Failed to complete service')
    } finally {
      setProcessingId(null)
    }
  }

  // Handle removing customer from queue
  const handleRemoveFromQueue = async (appointmentId) => {
    try {
      setProcessingId(appointmentId)
      setError('')

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setWalkIns(prev => prev.filter(w => w.id !== appointmentId))
      } else {
        setError(result.error || 'Failed to remove from queue')
      }
    } catch (error) {
      console.error('Remove from queue error:', error)
      setError('Failed to remove from queue')
    } finally {
      setProcessingId(null)
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

  const getWaitTimeColor = (minutes) => {
    if (minutes <= 30) return 'text-green-600 bg-green-50'
    if (minutes <= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // Show loading state while authentication loads
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Loading walk-in queue...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">Please log in to access the walk-in queue.</p>
          <a href="/login" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Walk-In Queue</h1>
              <p className="mt-2 text-gray-600 dark:text-dark-text-secondary">
                Manage walk-in customers waiting for service
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadWalkInQueue}
                disabled={loadingQueue}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loadingQueue ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <XMarkIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{walkIns.length}</p>
                <p className="text-gray-600 dark:text-dark-text-secondary">Customers Waiting</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {walkIns.length > 0 ? Math.max(...walkIns.map(w => w.queue_position * 30)) : 0}m
                </p>
                <p className="text-gray-600 dark:text-dark-text-secondary">Longest Wait</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {walkIns.length > 0 ? walkIns[0]?.queue_position || 1 : 0}
                </p>
                <p className="text-gray-600 dark:text-dark-text-secondary">Next in Line</p>
              </div>
            </div>
          </div>
        </div>

        {/* Walk-In Queue */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Current Queue</h2>
          </div>

          {barbershopId ? (
            loadingQueue ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-gray-600 dark:text-dark-text-secondary">Loading queue...</p>
              </div>
            ) : walkIns.length === 0 ? (
              <div className="p-8 text-center">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-dark-text-secondary">No walk-in customers waiting</p>
                <p className="text-gray-500 text-sm mt-2">New walk-ins can be added from the check-in page</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {walkIns.map((walkIn) => (
                  <div key={walkIn.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mr-3">
                            #{walkIn.queue_position}
                          </span>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {walkIn.customers?.full_name || 'Unknown Customer'}
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Service</p>
                            <p className="font-medium text-gray-900 dark:text-white">{walkIn.service_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Arrived At</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatTime(walkIn.start_time)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-dark-text-secondary">Estimated Wait</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getWaitTimeColor(walkIn.queue_position * 30)}`}>
                              {walkIn.queue_position * 30} minutes
                            </span>
                          </div>
                        </div>

                        {walkIn.notes && (
                          <div className="mt-3">
                            <p className="text-gray-500 dark:text-dark-text-secondary text-sm">Notes</p>
                            <p className="text-gray-700 dark:text-dark-text text-sm">{walkIn.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {walkIn.customers?.phone && (
                          <button
                            onClick={() => window.open(`tel:${walkIn.customers.phone}`, '_self')}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                            title="Call customer"
                          >
                            <PhoneIcon className="h-5 w-5" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleCompleteService(walkIn.id)}
                          disabled={processingId === walkIn.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {processingId === walkIn.id ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                          Complete Service
                        </button>
                        
                        <button
                          onClick={() => handleRemoveFromQueue(walkIn.id)}
                          disabled={processingId === walkIn.id}
                          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600 dark:text-dark-text-secondary">Loading barbershop information...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">Walk-In Management</h2>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-2">
            <p>1. <strong>Add Walk-Ins:</strong> Use the check-in page to add new walk-in customers</p>
            <p>2. <strong>Queue Order:</strong> Customers are served in order of arrival</p>
            <p>3. <strong>Complete Service:</strong> Mark customers as complete when their service is finished</p>
            <p>4. <strong>Auto-Refresh:</strong> Queue updates automatically every 30 seconds</p>
          </div>
        </div>
      </div>
    </div>
  )
}