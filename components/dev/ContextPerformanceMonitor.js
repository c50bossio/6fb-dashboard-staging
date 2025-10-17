'use client'

import { useState, useEffect } from 'react'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'

/**
 * Development component to monitor context system performance
 * Shows cache statistics, hit rates, and performance metrics
 */
export default function ContextPerformanceMonitor() {
  const { getCacheStats, activeContext } = useGlobalDashboard()
  const [stats, setStats] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (!isVisible) return
    
    const updateStats = () => {
      try {
        const cacheStats = getCacheStats()
        setStats({
          ...cacheStats,
          timestamp: new Date().toLocaleTimeString()
        })
      } catch (error) {
        console.warn('Failed to get cache stats:', error)
      }
    }
    
    // Update immediately
    updateStats()
    
    // Update every 2 seconds while visible
    const interval = setInterval(updateStats, 2000)
    
    return () => clearInterval(interval)
  }, [isVisible, getCacheStats])
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        {isVisible ? '📊 Hide Stats' : '📊 Cache Stats'}
      </button>
      
      {/* Statistics Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Context Cache Performance</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {stats ? (
            <div className="space-y-3 text-sm">
              {/* Current Context */}
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-medium text-blue-900">Active Context</div>
                <div className="text-blue-700">
                  {activeContext?.displayName || 'None'}
                </div>
                {activeContext?.contextType && (
                  <div className="text-blue-600 text-xs">
                    Type: {activeContext.contextType} | Location: {activeContext.locationId}
                  </div>
                )}
              </div>
              
              {/* Cache Overview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 p-2 rounded text-center">
                  <div className="font-medium text-green-900">{stats.size}</div>
                  <div className="text-green-700 text-xs">Cached Items</div>
                </div>
                <div className="bg-purple-50 p-2 rounded text-center">
                  <div className="font-medium text-purple-900">{Math.round(stats.hitRate)}%</div>
                  <div className="text-purple-700 text-xs">Hit Rate</div>
                </div>
              </div>
              
              {/* Data Type Breakdown */}
              <div>
                <div className="font-medium text-gray-700 mb-1">Cache by Type</div>
                <div className="space-y-1">
                  {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-gray-600">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Priority Breakdown */}
              <div>
                <div className="font-medium text-gray-700 mb-1">By Priority</div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">High: {stats.priorities.high}</span>
                  <span className="text-yellow-600">Med: {stats.priorities.medium}</span>
                  <span className="text-green-600">Low: {stats.priorities.low}</span>
                </div>
              </div>
              
              {/* Performance Tips */}
              <div className="bg-gray-50 p-2 rounded text-xs">
                <div className="font-medium text-gray-700 mb-1">Performance Tips</div>
                <div className="text-gray-600 space-y-1">
                  {stats.hitRate > 50 && <div>✅ Good cache hit rate</div>}
                  {stats.hitRate <= 30 && <div>⚠️ Low cache hit rate - check data patterns</div>}
                  {stats.size > 80 && <div>🧹 Large cache - cleanup will trigger soon</div>}
                  {stats.priorities.high > stats.priorities.low && <div>⚡ High priority data dominant</div>}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                Updated: {stats.timestamp}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Loading cache statistics...
            </div>
          )}
        </div>
      )}
    </div>
  )
}