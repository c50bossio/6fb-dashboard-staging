'use client'

import { ExclamationTriangleIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { getSystemStatus, getDegradedModeFeatures } from '@/lib/fallback-systems'

export default function SystemStatusBanner() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [degradedFeatures, setDegradedFeatures] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkSystemStatus = () => {
      const status = getSystemStatus()
      const degraded = getDegradedModeFeatures()
      
      setSystemStatus(status)
      setDegradedFeatures(degraded)
      
      // Show banner if there are any issues and user hasn't dismissed it
      const hasIssues = status.fallbacksActive || degraded.length > 0
      setIsVisible(hasIssues && !isDismissed)
    }

    // Initial check
    checkSystemStatus()
    
    // Check every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000)
    
    return () => clearInterval(interval)
  }, [isDismissed])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  if (!isVisible || (!systemStatus?.fallbacksActive && degradedFeatures.length === 0)) {
    return null
  }

  const getStatusColor = (feature) => {
    switch (feature.status) {
      case 'unavailable':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'limited':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getStatusIcon = (feature) => {
    switch (feature.status) {
      case 'unavailable':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
      case 'limited':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
      default:
        return <CheckCircleIcon className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            <div>
              <p className="font-semibold text-sm">
                System Status Update
              </p>
              <p className="text-xs opacity-90">
                Some services are running in degraded mode
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Detailed status */}
        {degradedFeatures.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="grid gap-2">
              {degradedFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded border ${getStatusColor(feature)}`}
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(feature)}
                    <span className="font-medium text-sm">{feature.feature}</span>
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                      feature.status === 'unavailable' ? 'bg-red-200 text-red-800' :
                      feature.status === 'limited' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {feature.status}
                    </span>
                  </div>
                  <p className="text-xs">{feature.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Circuit breaker info */}
        {systemStatus?.fallbacksActive && (
          <div className="mt-2 text-xs opacity-80">
            Automatic fallback systems are active. Full functionality will resume when services recover.
          </div>
        )}
      </div>
    </div>
  )
}

// System status indicator for smaller displays
export function SystemStatusIndicator() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const checkSystemStatus = () => {
      const status = getSystemStatus()
      setSystemStatus(status)
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!systemStatus?.fallbacksActive) {
    return null
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
      >
        <ExclamationTriangleIcon className="h-4 w-4" />
      </button>
      
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-xs">
            <p className="font-medium mb-1">System Status</p>
            <p>Some services are using fallback systems. Functionality may be limited.</p>
          </div>
        </div>
      )}
    </div>
  )
}