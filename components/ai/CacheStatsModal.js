'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  TrashIcon, 
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  DatabaseIcon
} from '@heroicons/react/24/outline'
import { getCacheManager } from '@/lib/ai-cache-manager'
import { getStreamingClient } from '@/lib/ai-streaming-client'

/**
 * AI Cache Statistics and Management Modal
 * Provides insights into cache performance and management tools
 */
export default function CacheStatsModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null)
  const [streamStats, setStreamStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)

  const loadStats = async () => {
    try {
      setLoading(true)
      const cacheManager = getCacheManager()
      const streamingClient = getStreamingClient()
      
      const [cacheStats, streamingStats] = await Promise.all([
        cacheManager.getCacheStats(),
        Promise.resolve(streamingClient.getCacheStats())
      ])
      
      setStats(cacheStats)
      setStreamStats(streamingStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached responses?')) {
      return
    }

    try {
      setClearing(true)
      const cacheManager = getCacheManager()
      await cacheManager.clearCache()
      await loadStats() // Reload stats
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-olive-600 rounded-full flex items-center justify-center">
              <DatabaseIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Cache Management</h3>
              <p className="text-sm text-gray-500">Performance insights and cache controls</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadStats}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
            <span className="ml-2 text-gray-600">Loading cache statistics...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-olive-50 to-olive-100 p-4 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-olive-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-olive-900">Hit Rate</p>
                    <p className="text-2xl font-bold text-olive-700">
                      {streamStats?.hitRate || '0%'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="flex items-center">
                  <DatabaseIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Cache Size</p>
                    <p className="text-2xl font-bold text-green-700">
                      {stats ? formatBytes(stats.totalSize) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gold-50 to-gold-100 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-gold-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gold-900">Total Entries</p>
                    <p className="text-2xl font-bold text-gold-700">
                      {stats?.totalEntries || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                <div className="flex items-center">
                  <TrashIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-900">Expired</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {stats?.expiredEntries || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cache Performance */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Hits</span>
                    <span className="text-sm font-medium text-gray-900">
                      {streamStats?.hits || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Misses</span>
                    <span className="text-sm font-medium text-gray-900">
                      {streamStats?.misses || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hit Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {streamStats?.hitRate || '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fallback Rate</span>
                    <span className="text-sm font-medium text-amber-800">
                      {streamStats?.fallbackRate || '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prefetch Hits</span>
                    <span className="text-sm font-medium text-olive-600">
                      {streamStats?.prefetchHits || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prefetch Efficiency</span>
                    <span className="text-sm font-medium text-olive-600">
                      {streamStats?.prefetchEfficiency || '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Valid Entries</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats?.validEntries || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Storage Details</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Size</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats ? formatBytes(stats.totalSize) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Entries</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats?.totalEntries || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expired Entries</span>
                    <span className="text-sm font-medium text-red-600">
                      {stats?.expiredEntries || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Oldest Entry</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats?.oldestEntry 
                        ? formatDate(stats.oldestEntry.timestamp)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cache Management Actions */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Management</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="px-4 py-2 bg-olive-600 text-white text-sm rounded-lg hover:bg-olive-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Stats</span>
                </button>
                
                <button
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>{clearing ? 'Clearing...' : 'Clear Cache'}</span>
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p className="mb-2">
                  <strong>Note:</strong> Clearing the cache will remove all stored AI responses. 
                  This may temporarily increase response times as new responses are generated and cached.
                </p>
                <p>
                  Cache automatically cleans up expired entries every hour to maintain optimal performance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}