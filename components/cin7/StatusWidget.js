'use client'

import {
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CloudArrowUpIcon,
  ClockIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function StatusWidget({ onSync, onSettings, compact = false }) {
  const [status, setStatus] = useState('checking') // checking, connected, syncing, error, disconnected
  const [lastSync, setLastSync] = useState(null)
  const [nextSync, setNextSync] = useState(null)
  const [syncDetails, setSyncDetails] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [health, setHealth] = useState('healthy') // healthy, degraded, offline

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Update relative time every minute
    const interval = setInterval(() => {
      if (lastSync) {
        setLastSync(prev => ({ ...prev })) // Force re-render
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [lastSync])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/cin7/health')
      const data = await response.json()
      
      if (data.status === 'healthy' || data.status === 'connected') {
        setStatus('connected')
        setHealth('healthy')
        setLastSync(data.lastSync)
        setNextSync(data.nextSync)
        setSyncDetails(data.metrics)
      } else if (data.status === 'degraded') {
        setStatus('connected')
        setHealth('degraded')
        setLastSync(data.lastSync)
      } else if (data.status === 'error' || data.issues?.length > 0) {
        setStatus('error')
        setHealth('degraded')
        setSyncDetails(data.issues)
      } else {
        setStatus('disconnected')
        setHealth('offline')
      }
    } catch (error) {
      setStatus('disconnected')
      setHealth('offline')
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    setStatus('syncing')
    
    try {
      const response = await fetch('/api/cin7/quick-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success || data.synced) {
        setStatus('connected')
        setLastSync(new Date().toISOString())
        setSyncDetails({
          synced: data.synced,
          updated: data.updated,
          duration: data.duration
        })
        
        // Show success briefly
        setTimeout(() => {
          setSyncDetails(null)
        }, 5000)
      } else {
        setStatus('error')
        setSyncDetails({ error: data.error })
      }
    } catch (error) {
      setStatus('error')
      setSyncDetails({ error: error.message })
    } finally {
      setIsSyncing(false)
      setTimeout(checkStatus, 2000) // Recheck status after sync
    }
    
    if (onSync) onSync()
  }

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return health === 'healthy' 
          ? <SignalIcon className="w-5 h-5 text-green-500" />
          : <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'syncing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'disconnected':
        return <SignalSlashIcon className="w-5 h-5 text-gray-400" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400 animate-pulse" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return health === 'healthy' ? 'Live Sync ON' : 'Sync Degraded'
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Sync Error'
      case 'disconnected':
        return 'Not Connected'
      default:
        return 'Checking...'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return health === 'healthy' ? 'text-green-600' : 'text-yellow-600'
      case 'syncing':
        return 'text-blue-600'
      case 'error':
        return 'text-red-600'
      case 'disconnected':
        return 'text-gray-500'
      default:
        return 'text-gray-400'
    }
  }

  if (compact) {
    return (
      <motion.div
        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {status === 'connected' && lastSync && (
          <span className="text-xs text-gray-500">
            {formatRelativeTime(lastSync)}
          </span>
        )}
      </motion.div>
    )
  }

  return (
    <>
      {/* Main Widget */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          bg-white rounded-lg shadow-lg border transition-all
          ${status === 'connected' && health === 'healthy' ? 'border-green-200' : ''}
          ${status === 'connected' && health === 'degraded' ? 'border-yellow-200' : ''}
          ${status === 'error' ? 'border-red-200' : ''}
          ${status === 'disconnected' ? 'border-gray-200' : ''}
          ${status === 'syncing' ? 'border-blue-200' : ''}
        `}
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className={`font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </h3>
                {status === 'connected' && lastSync && (
                  <p className="text-xs text-gray-500">
                    Last sync: {formatRelativeTime(lastSync)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {status === 'connected' && !isSyncing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleManualSync()
                  }}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Sync Now"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
              )}
              
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                className="text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-100 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {status === 'connected' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Connection:</span>
                        <p className="font-medium text-gray-900">CIN7 Core</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Mode:</span>
                        <p className="font-medium text-gray-900">Auto-sync</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Next sync:</span>
                        <p className="font-medium text-gray-900">
                          {nextSync || 'In 15 minutes'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Health:</span>
                        <p className={`font-medium ${
                          health === 'healthy' ? 'text-green-600' : 
                          health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {health.charAt(0).toUpperCase() + health.slice(1)}
                        </p>
                      </div>
                    </div>

                    {syncDetails && syncDetails.synced && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✓ Synced {syncDetails.synced} products
                          {syncDetails.updated && ` (${syncDetails.updated} updated)`}
                          {syncDetails.duration && ` in ${syncDetails.duration}`}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleManualSync()
                        }}
                        disabled={isSyncing}
                        className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onSettings) onSettings()
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                      >
                        Settings
                      </button>
                    </div>
                  </>
                )}

                {status === 'error' && syncDetails && (
                  <div className="space-y-3">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-800">
                        {syncDetails.error || 'An error occurred during sync'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleManualSync()
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      Retry Sync
                    </button>
                  </div>
                )}

                {status === 'disconnected' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Connect your CIN7 account to enable automatic inventory sync
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onSettings) onSettings()
                      }}
                      className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                    >
                      Connect CIN7
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Sync Indicator (shows during sync) */}
      <AnimatePresence>
        {status === 'syncing' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50"
          >
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            <span className="font-medium">Syncing inventory...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}