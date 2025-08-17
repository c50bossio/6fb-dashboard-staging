'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CloudArrowDownIcon,
  ClockIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

export default function Cin7SyncStatus({ onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, success, error
  const [lastSync, setLastSync] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    checkCin7Status()
  }, [])

  const checkCin7Status = async () => {
    try {
      const response = await fetch('/api/cin7/credentials')
      const data = await response.json()
      
      if (data.hasCredentials) {
        setIsConnected(true)
        if (data.credentials?.lastSynced) {
          setLastSync(new Date(data.credentials.lastSynced))
        }
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error checking CIN7 status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncStatus('syncing')
    setSyncMessage('Connecting to CIN7...')
    
    try {
      // Start the sync
      const response = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setSyncStatus('success')
        setProductCount(data.count || 0)
        setLowStockCount(data.lowStockCount || 0)
        setOutOfStockCount(data.outOfStockCount || 0)
        setLastSync(new Date())
        setSyncMessage(`Successfully synced ${data.count} products`)
        
        // Notify parent component
        if (onSyncComplete) {
          onSyncComplete(data)
        }
        
        // Reset status after 5 seconds
        setTimeout(() => {
          setSyncStatus('idle')
          setSyncMessage('')
        }, 5000)
      } else {
        setSyncStatus('error')
        setSyncMessage(data.error || 'Sync failed. Please check your connection.')
        
        // Reset status after 5 seconds
        setTimeout(() => {
          setSyncStatus('idle')
          setSyncMessage('')
        }, 5000)
      }
    } catch (error) {
      setSyncStatus('error')
      setSyncMessage('Network error. Please try again.')
      console.error('Sync error:', error)
      
      setTimeout(() => {
        setSyncStatus('idle')
        setSyncMessage('')
      }, 5000)
    }
  }

  const formatLastSync = (date) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">CIN7 Not Connected</h3>
            <p className="text-sm text-amber-700 mt-1">
              Connect your CIN7 account to sync real inventory data. Currently showing sample data.
            </p>
          </div>
          <LinkIcon className="h-5 w-5 text-amber-600 ml-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <CloudArrowDownIcon className="h-5 w-5 text-gray-400 mr-2" />
            CIN7 Integration
          </h3>
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
              Connected
            </span>
            <span className="flex items-center">
              <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
              Last sync: {formatLastSync(lastSync)}
            </span>
            {productCount > 0 && (
              <span>{productCount} products</span>
            )}
          </div>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
          className={`
            inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${syncStatus === 'syncing' 
              ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' 
              : syncStatus === 'success'
              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
              : syncStatus === 'error'
              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500'
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-olive-500'
            }
          `}
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      
      {/* Sync message */}
      {syncMessage && (
        <div className={`mt-3 text-sm ${
          syncStatus === 'success' ? 'text-green-600' : 
          syncStatus === 'error' ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {syncMessage}
        </div>
      )}
      
      {/* Stock alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && syncStatus === 'success' && (
        <div className="mt-3 flex items-center space-x-4 text-sm">
          {lowStockCount > 0 && (
            <span className="text-amber-600">
              ⚠️ {lowStockCount} low stock items
            </span>
          )}
          {outOfStockCount > 0 && (
            <span className="text-red-600">
              ❌ {outOfStockCount} out of stock
            </span>
          )}
        </div>
      )}
    </div>
  )
}
