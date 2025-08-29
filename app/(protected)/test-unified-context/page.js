'use client'

import { useGlobalDashboard } from '../../../contexts/GlobalDashboardContext'
import { useEffect, useState } from 'react'

export default function TestUnifiedContext() {
  const { 
    activeContext, 
    availableContexts, 
    contextualData, 
    contextLoading,
    getCacheStats,
    switchContext
  } = useGlobalDashboard()
  
  const [cacheStats, setCacheStats] = useState(null)
  
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stats = getCacheStats()
        setCacheStats(stats)
      } catch (err) {
        console.error('Failed to get cache stats:', err)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [getCacheStats])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Unified Context System Test</h1>
      
      {/* Active Context Display */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Context</h2>
        {activeContext ? (
          <div className="space-y-2">
            <p><strong>Display Name:</strong> {activeContext.displayName}</p>
            <p><strong>Location:</strong> {activeContext.locationName} (ID: {activeContext.locationId})</p>
            <p><strong>Type:</strong> {activeContext.contextType}</p>
            <p><strong>Primary View:</strong> {activeContext.primaryView}</p>
            <p><strong>User ID:</strong> {activeContext.userId}</p>
            <p><strong>Role:</strong> {activeContext.role}</p>
          </div>
        ) : (
          <p className="text-gray-500">No active context selected</p>
        )}
      </div>

      {/* Available Contexts */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available Contexts ({availableContexts?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(availableContexts || []).map((context, index) => (
            <button
              key={index}
              onClick={() => switchContext(context)}
              className={`p-4 border rounded-lg text-left transition-all ${
                activeContext?.displayName === context.displayName
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{context.displayName}</div>
              <div className="text-sm text-gray-600 mt-1">
                {context.contextType} • {context.primaryView}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Data */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Contextual Data {contextLoading && '(Loading...)'}
        </h2>
        {contextualData ? (
          <div className="space-y-4">
            {contextualData.appointments && (
              <div>
                <h3 className="font-medium">Appointments</h3>
                <p className="text-gray-600">Count: {contextualData.appointments.length}</p>
              </div>
            )}
            {contextualData.staff && (
              <div>
                <h3 className="font-medium">Staff</h3>
                <p className="text-gray-600">Count: {contextualData.staff.length}</p>
              </div>
            )}
            {contextualData.services && (
              <div>
                <h3 className="font-medium">Services</h3>
                <p className="text-gray-600">Count: {contextualData.services.length}</p>
              </div>
            )}
            {contextualData.metrics && (
              <div>
                <h3 className="font-medium">Metrics</h3>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                  {JSON.stringify(contextualData.metrics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No contextual data loaded</p>
        )}
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Cache Statistics</h2>
        {cacheStats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cacheStats.size}</div>
                <div className="text-sm text-gray-600">Cached Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(cacheStats.hitRate)}%</div>
                <div className="text-sm text-gray-600">Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{cacheStats.priorities?.high || 0}</div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{cacheStats.priorities?.low || 0}</div>
                <div className="text-sm text-gray-600">Low Priority</div>
              </div>
            </div>
            
            {cacheStats?.typeBreakdown && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Cache by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(cacheStats.typeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-gray-600">{type}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">Loading cache statistics...</p>
        )}
      </div>
    </div>
  )
}