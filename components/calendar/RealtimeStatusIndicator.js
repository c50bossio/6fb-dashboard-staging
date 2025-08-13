'use client'

import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

export default function RealtimeStatusIndicator({ 
  isConnected, 
  lastUpdate, 
  connectionAttempts,
  appointmentCount,
  eventCounts,
  error 
}) {
  // Determine status color and icon
  const getStatusConfig = () => {
    if (error) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircleIcon,
        label: 'Connection Error',
        pulse: false
      }
    }
    
    if (isConnected) {
      return {
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircleIcon,
        label: 'Real-time Connected',
        pulse: true
      }
    }
    
    if (connectionAttempts > 0) {
      return {
        color: 'text-amber-800',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: ArrowPathIcon,
        label: `Connecting... (Attempt ${connectionAttempts})`,
        pulse: false,
        spin: true
      }
    }
    
    return {
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: ExclamationTriangleIcon,
      label: 'Disconnected',
      pulse: false
    }
  }
  
  const config = getStatusConfig()
  const Icon = config.icon
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon 
            className={`w-5 h-5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} 
          />
          {config.pulse && isConnected && (
            <span className="absolute -top-1 -right-1 w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
      
      {/* Show appointment count and last update when connected */}
      {isConnected && (
        <>
          <div className="h-4 w-px bg-gray-300"></div>
          <span className="text-xs text-gray-500">
            {appointmentCount} appointments
          </span>
          {lastUpdate && (
            <>
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="text-xs text-gray-500">
                Updated {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            </>
          )}
        </>
      )}
      
      {/* Show event counts if available */}
      {eventCounts && (eventCounts.INSERT > 0 || eventCounts.UPDATE > 0 || eventCounts.DELETE > 0) && (
        <>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex gap-2 text-xs">
            {eventCounts.INSERT > 0 && (
              <span className="text-green-600">+{eventCounts.INSERT}</span>
            )}
            {eventCounts.UPDATE > 0 && (
              <span className="text-olive-600">↻{eventCounts.UPDATE}</span>
            )}
            {eventCounts.DELETE > 0 && (
              <span className="text-red-600">-{eventCounts.DELETE}</span>
            )}
          </div>
        </>
      )}
      
      {/* Show error message if present */}
      {error && (
        <>
          <div className="h-4 w-px bg-gray-300"></div>
          <span className="text-xs text-red-500 truncate max-w-xs">
            {error}
          </span>
        </>
      )}
    </div>
  )
}