'use client'

import { format, formatDistance, parseISO } from 'date-fns'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Info,
  TrendingUp
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * Real-time Payout Status Indicator Component
 * Features:
 * - Visual status representation with icons and colors
 * - Real-time status updates via polling or WebSocket
 * - Progress indicator for processing states
 * - Detailed status information in tooltips
 * - Click to view status history
 * - Animated transitions for status changes
 */
export default function PayoutStatusIndicator({ 
  status,
  payoutId = null,
  lastUpdate = null,
  updateCount = 1,
  estimatedCompletion = null,
  showLastUpdate = true,
  showUpdateCount = true,
  size = 'default', // 'sm' | 'default' | 'lg'
  interactive = true,
  onStatusClick = null,
  enableRealTimeUpdates = true
}) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [isAnimating, setIsAnimating] = useState(false)
  const [realTimeData, setRealTimeData] = useState(null)
  const [polling, setPolling] = useState(false)

  // Real-time updates via polling (in production, use WebSocket)
  useEffect(() => {
    if (!enableRealTimeUpdates || !payoutId) return

    let pollInterval
    
    const pollForUpdates = async () => {
      try {
        setPolling(true)
        const response = await fetch(`/api/payout-history/status/${payoutId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.status !== currentStatus) {
            // Animate status change
            setIsAnimating(true)
            setTimeout(() => {
              setCurrentStatus(data.data.status)
              setRealTimeData(data.data)
              setIsAnimating(false)
            }, 300)
          }
        }
      } catch (error) {
        console.error('Error polling for status updates:', error)
      } finally {
        setPolling(false)
      }
    }

    // Poll more frequently for active statuses
    const pollInterval_ms = ['pending', 'processing'].includes(currentStatus) ? 30000 : 60000
    
    pollInterval = setInterval(pollForUpdates, pollInterval_ms)
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [payoutId, currentStatus, enableRealTimeUpdates])

  // Status configuration
  const getStatusConfig = (statusValue) => {
    const configs = {
      pending: {
        label: 'Pending',
        icon: Clock,
        variant: 'outline',
        className: 'text-yellow-700 border-yellow-300 bg-yellow-50',
        description: 'Payout is queued for processing',
        color: 'yellow',
        pulse: false
      },
      processing: {
        label: 'Processing',
        icon: RefreshCw,
        variant: 'outline',
        className: 'text-blue-700 border-blue-300 bg-blue-50',
        description: 'Transfer is being processed by payment provider',
        color: 'blue',
        pulse: true
      },
      completed: {
        label: 'Completed',
        icon: CheckCircle,
        variant: 'default',
        className: 'bg-green-100 text-green-800 border-green-300',
        description: 'Payout successfully completed',
        color: 'green',
        pulse: false
      },
      failed: {
        label: 'Failed',
        icon: XCircle,
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 border-red-300',
        description: 'Payout failed - may require retry or manual intervention',
        color: 'red',
        pulse: false
      },
      cancelled: {
        label: 'Cancelled',
        icon: XCircle,
        variant: 'outline',
        className: 'text-gray-700 border-gray-300 bg-gray-50',
        description: 'Payout was cancelled before processing',
        color: 'gray',
        pulse: false
      },
      reversed: {
        label: 'Reversed',
        icon: AlertCircle,
        variant: 'outline',
        className: 'text-orange-700 border-orange-300 bg-orange-50',
        description: 'Completed payout was reversed by payment provider',
        color: 'orange',
        pulse: false
      }
    }
    
    return configs[statusValue] || configs.pending
  }

  const config = getStatusConfig(currentStatus)
  const IconComponent = config.icon

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: 'text-xs px-2 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    default: {
      badge: 'text-sm px-2.5 py-1',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      badge: 'text-base px-3 py-1.5',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  }

  const sizes = sizeConfig[size]

  // Format last update time
  const formatLastUpdate = (updateTime) => {
    if (!updateTime) return null
    
    try {
      const date = parseISO(updateTime)
      const now = new Date()
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h ago`
      } else {
        return format(date, 'MMM dd')
      }
    } catch {
      return null
    }
  }

  // Progress calculation for processing states
  const getProgressPercentage = () => {
    if (currentStatus !== 'processing') return 0
    
    if (estimatedCompletion) {
      const now = new Date()
      const completion = parseISO(estimatedCompletion)
      const start = lastUpdate ? parseISO(lastUpdate) : now
      const total = completion.getTime() - start.getTime()
      const elapsed = now.getTime() - start.getTime()
      return Math.min(Math.max((elapsed / total) * 100, 10), 90)
    }
    
    return 45 // Default progress for processing
  }

  // Handle click action
  const handleClick = () => {
    if (onStatusClick) {
      onStatusClick(currentStatus, payoutId)
    }
  }

  // Main badge component
  const StatusBadge = () => (
    <Badge 
      variant={config.variant}
      className={`
        ${config.className} 
        ${sizes.badge}
        ${isAnimating ? 'transition-all duration-300 scale-110' : ''}
        ${interactive ? 'cursor-pointer hover:opacity-80' : ''}
        ${config.pulse ? 'animate-pulse' : ''}
        flex items-center gap-1.5 relative overflow-hidden
      `}
      onClick={interactive ? handleClick : undefined}
    >
      {/* Progress bar for processing status */}
      {currentStatus === 'processing' && (
        <div 
          className="absolute inset-0 bg-blue-200 opacity-30 transition-all duration-1000"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      )}
      
      <IconComponent 
        className={`
          ${sizes.icon} 
          ${config.pulse ? 'animate-spin' : ''} 
          ${polling ? 'animate-pulse' : ''}
          relative z-10
        `} 
      />
      
      <span className={`${sizes.text} font-medium relative z-10`}>
        {config.label}
      </span>
      
      {/* Update count indicator */}
      {showUpdateCount && updateCount > 1 && (
        <div className="relative z-10">
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 border">
            {updateCount > 9 ? '9+' : updateCount}
          </div>
        </div>
      )}
    </Badge>
  )

  // Tooltip content
  const TooltipContent_Component = () => (
    <div className="space-y-2 max-w-xs">
      <div>
        <p className="font-medium text-sm">{config.label} Status</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      
      {showLastUpdate && lastUpdate && (
        <div className="text-xs">
          <span className="text-muted-foreground">Last updated: </span>
          <span className="font-medium">{formatLastUpdate(lastUpdate)}</span>
        </div>
      )}
      
      {currentStatus === 'processing' && estimatedCompletion && (
        <div className="text-xs">
          <span className="text-muted-foreground">Estimated completion: </span>
          <span className="font-medium">
            {formatDistance(new Date(), parseISO(estimatedCompletion), { addSuffix: true })}
          </span>
        </div>
      )}
      
      {realTimeData?.metadata && (
        <div className="text-xs pt-1 border-t">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-green-600 font-medium">Live updates enabled</span>
          </div>
        </div>
      )}
      
      {interactive && (
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Click for detailed status history
        </div>
      )}
    </div>
  )

  // Detailed popover content for complex status info
  const PopoverContent_Component = () => (
    <div className="w-80 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Status Details</h4>
        {polling && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Status:</span>
          <StatusBadge />
        </div>
        
        {lastUpdate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Updated:</span>
            <span className="text-sm font-medium">
              {format(parseISO(lastUpdate), 'MMM dd, h:mm a')}
            </span>
          </div>
        )}
        
        {updateCount > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status Changes:</span>
            <Badge variant="outline" className="text-xs">
              {updateCount} updates
            </Badge>
          </div>
        )}
        
        {currentStatus === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <span className="text-sm font-medium">{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}
        
        {estimatedCompletion && ['pending', 'processing'].includes(currentStatus) && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ETA:</span>
            <span className="text-sm font-medium">
              {formatDistance(new Date(), parseISO(estimatedCompletion), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {config.description}
      </div>
    </div>
  )

  // Return appropriate wrapper based on interaction mode
  if (interactive && size !== 'sm') {
    return (
      <TooltipProvider>
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <StatusBadge />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <TooltipContent_Component />
                </TooltipContent>
              </Tooltip>
            </div>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="center">
            <PopoverContent_Component />
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    )
  }

  // Simple tooltip for smaller sizes or non-interactive mode
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <StatusBadge />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <TooltipContent_Component />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}