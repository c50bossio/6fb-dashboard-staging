'use client'

import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

/**
 * Admin dashboard for monitoring profile consistency health
 */
export default function ProfileHealthDashboard() {
  const [healthStatus, setHealthStatus] = useState(null)
  const [syncResults, setSyncResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadHealthStatus()
  }, [])

  const loadHealthStatus = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/users/sync-profiles')
      
      if (response.ok) {
        const data = await response.json()
        setHealthStatus(data)
      } else {
        console.error('Failed to load health status')
      }
    } catch (error) {
      console.error('Error loading health status:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const runProfileSync = async (dryRun = false) => {
    try {
      setSyncing(true)
      
      const response = await fetch('/api/admin/users/sync-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, batchSize: 50 })
      })

      if (response.ok) {
        const data = await response.json()
        setSyncResults(data)
        
        // Refresh health status after sync
        setTimeout(loadHealthStatus, 1000)
      } else {
        const error = await response.json()
        console.error('Sync failed:', error)
      }
    } catch (error) {
      console.error('Error running sync:', error)
    } finally {
      setSyncing(false)
    }
  }

  const getHealthScoreColor = (score) => {
    if (score >= 95) return 'text-green-600 bg-green-50'
    if (score >= 85) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getHealthScoreIcon = (score) => {
    if (score >= 95) return CheckCircleIcon
    return ExclamationTriangleIcon
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <UserGroupIcon className="h-6 w-6 mr-2" />
              Profile Health Monitor
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor and maintain user profile consistency across the platform
            </p>
          </div>
          <button
            onClick={loadHealthStatus}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Health Score Overview */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${getHealthScoreColor(healthStatus.healthScore)}`}>
                {(() => {
                  const Icon = getHealthScoreIcon(healthStatus.healthScore)
                  return <Icon className="h-6 w-6" />
                })()}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Health Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthStatus.healthScore}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Consistent Profiles</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthStatus.status?.consistent || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inconsistent Profiles</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {healthStatus.status?.inconsistent || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Breakdown */}
      {healthStatus?.status?.byRole && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Consistency by Role
          </h3>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consistent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inconsistent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(healthStatus.status.byRole).map(([role, stats]) => {
                  const healthPercent = Math.round((stats.consistent / stats.total) * 100)
                  return (
                    <tr key={role}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {stats.consistent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {stats.inconsistent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          healthPercent >= 95 ? 'bg-green-100 text-green-800' :
                          healthPercent >= 85 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {healthPercent}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Synchronization</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => runProfileSync(true)}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            {syncing ? 'Running...' : 'Dry Run Check'}
          </button>
          <button
            onClick={() => runProfileSync(false)}
            disabled={syncing || (healthStatus?.healthScore >= 95)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            {syncing ? 'Syncing...' : 'Fix Inconsistencies'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Dry run will show what would be changed without making actual updates. 
          Fix inconsistencies will update profiles to ensure role/tier consistency.
        </p>
      </div>

      {/* Sync Results */}
      {syncResults && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Last Sync Results {syncResults.dryRun && '(Dry Run)'}
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Total Profiles</p>
                <p className="text-lg font-semibold">{syncResults.results?.total || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Synced</p>
                <p className="text-lg font-semibold text-green-600">{syncResults.results?.synced || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-lg font-semibold text-red-600">{syncResults.results?.errors || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-sm font-semibold text-blue-600">
                  {syncResults.dryRun ? 'Preview' : 'Applied'}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {syncResults.message}
            </p>
          </div>
        </div>
      )}

      {/* Last Updated */}
      {healthStatus && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}