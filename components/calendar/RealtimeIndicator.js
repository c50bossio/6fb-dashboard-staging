'use client'

import { WifiIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

export default function RealtimeIndicator({ isConnected, lastUpdate, errorMessage }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pulseAnimation, setPulseAnimation] = useState(false)

  useEffect(() => {
    if (lastUpdate) {
      setPulseAnimation(true)
      const timer = setTimeout(() => setPulseAnimation(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [lastUpdate])

  const getStatusColor = () => {
    if (errorMessage) return 'text-red-500'
    if (isConnected) return 'text-green-500'
    return 'text-gray-400'
  }

  const getStatusIcon = () => {
    if (errorMessage) {
      return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
    }
    if (isConnected) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    }
    return <WifiIcon className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (errorMessage) return `Error: ${errorMessage}`
    if (isConnected) {
      if (lastUpdate) {
        const timeAgo = new Date() - new Date(lastUpdate)
        if (timeAgo < 60000) {
          return `Live • Updated ${Math.floor(timeAgo / 1000)}s ago`
        }
        return `Live • Updated ${Math.floor(timeAgo / 60000)}m ago`
      }
      return 'Live • Connected'
    }
    return 'Connecting...'
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-full 
          bg-white border transition-all duration-300
          ${isConnected ? 'border-green-200 hover:border-green-300' : 'border-gray-200'}
          ${pulseAnimation ? 'animate-pulse' : ''}
        `}
      >
        <div className="relative">
          {getStatusIcon()}
          {isConnected && (
            <span className="absolute -top-1 -right-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </span>
          )}
        </div>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-0 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs">
            <p className="font-semibold mb-1">Real-time Sync</p>
            <p className="text-gray-300">
              {isConnected 
                ? 'Calendar updates automatically when appointments change.'
                : 'Connecting to live updates...'
              }
            </p>
            {lastUpdate && (
              <p className="text-gray-400 mt-1">
                Last sync: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="absolute top-0 left-4 -mt-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  )
}