'use client'

import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function WalkInQueueWidget({ barbershopId }) {
  const [walkIns, setWalkIns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (barbershopId) {
      fetchWalkIns()
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchWalkIns, 30000)
      return () => clearInterval(interval)
    }
  }, [barbershopId])

  const fetchWalkIns = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/walk-ins?barbershop_id=${barbershopId}`)
      const result = await response.json()

      if (result.success) {
        setWalkIns(result.walk_ins || [])
      } else {
        setError(result.error || 'Failed to load walk-ins')
      }
    } catch (err) {
      setError('Network error loading walk-ins')
      console.error('Walk-in fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'WALK_IN_WAITING':
        return {
          color: 'text-orange-600 bg-orange-50',
          icon: ClockIcon,
          label: 'Waiting'
        }
      case 'IN_SERVICE':
        return {
          color: 'text-blue-600 bg-blue-50',
          icon: PlayIcon,
          label: 'In Service'
        }
      case 'completed':
        return {
          color: 'text-green-600 bg-green-50',
          icon: CheckCircleIcon,
          label: 'Completed'
        }
      default:
        return {
          color: 'text-gray-600 bg-gray-50',
          icon: ClockIcon,
          label: 'Unknown'
        }
    }
  }

  const totalWaiting = walkIns.filter(w => w.status === 'WALK_IN_WAITING').length
  const inService = walkIns.filter(w => w.status === 'IN_SERVICE').length

  if (!barbershopId) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="h-6 w-6 text-orange-500" />
            Walk-In Queue
          </h3>
          
          {!loading && !error && (
            <div className="flex items-center gap-2">
              {totalWaiting > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {totalWaiting} waiting
                </span>
              )}
              {inService > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {inService} in service
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWalkIns}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh walk-in queue"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Link
            href="/dashboard/checkin"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Add Walk-In
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading walk-in queue...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mx-auto mb-3" />
          <p className="text-red-800 font-medium text-sm">Failed to load walk-ins</p>
          <p className="text-red-700 text-xs mt-1">{error}</p>
          <button 
            onClick={fetchWalkIns}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs"
          >
            Try Again
          </button>
        </div>
      ) : walkIns.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <UserGroupIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No walk-ins in queue</p>
          <p className="text-gray-500 text-xs mt-1">Walk-in customers will appear here when added</p>
          <Link
            href="/dashboard/checkin"
            className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs"
          >
            <PlusIcon className="h-4 w-4" />
            Add First Walk-In
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {walkIns.slice(0, 5).map((walkIn) => {
            const statusInfo = getStatusInfo(walkIn.status)
            const StatusIcon = statusInfo.icon

            return (
              <div key={walkIn.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${statusInfo.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    {walkIn.status === 'WALK_IN_WAITING' && (
                      <span className="text-lg font-bold text-orange-600">
                        #{walkIn.queue_position}
                      </span>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {walkIn.customers?.full_name || 'Walk-in Customer'}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Service: {walkIn.service || 'Walk-in Service'}</span>
                      {walkIn.estimated_wait && walkIn.status === 'WALK_IN_WAITING' && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {walkIn.estimated_wait}min wait
                        </span>
                      )}
                      {walkIn.active_barbers > 1 && (
                        <span className="text-blue-600">
                          {walkIn.active_barbers} barbers working
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {walkIn.status === 'WALK_IN_WAITING' && (
                    <button className="px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium">
                      Start Service
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          
          {walkIns.length > 5 && (
            <Link 
              href="/dashboard/checkin"
              className="block w-full py-2 text-sm font-medium text-orange-600 hover:text-orange-800 border-t border-gray-100 pt-4 text-center"
            >
              View all {walkIns.length} walk-ins →
            </Link>
          )}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Auto-refreshes every 30 seconds</span>
        <Link 
          href="/dashboard/checkin"
          className="text-orange-600 hover:text-orange-800 font-medium"
        >
          Manage Queue →
        </Link>
      </div>
    </div>
  )
}