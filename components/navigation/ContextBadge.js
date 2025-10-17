'use client'

import React from 'react'
import { 
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { cn } from '@/lib/utils'

/**
 * Context Badge - Small visual indicator showing current context level
 * 
 * Compact badge that appears in header/toolbar to show context scope
 * Color-coded by level: Blue (Org), Green (Location), Orange (Resource)
 */

export default function ContextBadge({ 
  className = "",
  size = "sm", // "xs", "sm", "md", "lg"
  showText = true,
  showIcon = true
}) {
  const { context } = useUnifiedContext()

  // Don't show if no context
  if (!context) {
    return null
  }

  // Get badge configuration based on context level
  const getBadgeConfig = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return {
          icon: BuildingOfficeIcon,
          color: "blue",
          text: "Org",
          fullText: "Organization",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          iconColor: "text-blue-600"
        }
        
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return {
          icon: BuildingStorefrontIcon,
          color: "green",
          text: "Loc", 
          fullText: "Location",
          bgColor: "bg-green-100",
          textColor: "text-green-800",
          iconColor: "text-green-600"
        }
        
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return {
          icon: UserIcon,
          color: "orange",
          text: context.metadata?.resourceType === 'BARBER' ? 'Bar' : 'Res',
          fullText: context.metadata?.resourceType === 'BARBER' ? 'Barber' : 'Resource',
          bgColor: "bg-orange-100", 
          textColor: "text-orange-800",
          iconColor: "text-orange-600"
        }
        
      default:
        return {
          icon: UserIcon,
          color: "gray",
          text: "Ctx",
          fullText: "Context",
          bgColor: "bg-gray-100",
          textColor: "text-gray-800", 
          iconColor: "text-gray-600"
        }
    }
  }

  const config = getBadgeConfig()

  // Get size classes
  const getSizeClasses = (size) => {
    const sizes = {
      xs: {
        container: "px-1.5 py-0.5 text-xs",
        icon: "h-3 w-3",
        spacing: "space-x-1"
      },
      sm: {
        container: "px-2 py-1 text-xs",
        icon: "h-3 w-3", 
        spacing: "space-x-1"
      },
      md: {
        container: "px-2.5 py-1 text-sm",
        icon: "h-4 w-4",
        spacing: "space-x-1.5"
      },
      lg: {
        container: "px-3 py-1.5 text-sm",
        icon: "h-4 w-4",
        spacing: "space-x-2"
      }
    }
    
    return sizes[size] || sizes.sm
  }

  const sizeClasses = getSizeClasses(size)

  // Determine display text based on size and showText prop
  const getDisplayText = () => {
    if (!showText) return null
    
    if (size === 'xs' || size === 'sm') {
      return config.text
    } else {
      return config.fullText
    }
  }

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.bgColor,
        config.textColor,
        sizeClasses.container,
        showIcon && showText && sizeClasses.spacing,
        className
      )}
      title={`${config.fullText} Context: ${context.displayName}`}
    >
      {showIcon && (
        <config.icon className={cn(sizeClasses.icon, config.iconColor)} />
      )}
      {showText && (
        <span>{getDisplayText()}</span>
      )}
    </span>
  )
}

// Dot indicator version - minimal space usage
export function ContextDot({ className = "", size = 8 }) {
  const { context } = useUnifiedContext()

  if (!context) {
    return null
  }

  const getColorClass = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return "bg-blue-500"
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return "bg-green-500"
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getLevelName = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return "Organization"
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return "Location" 
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return "Resource"
      default:
        return "Context"
    }
  }

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        getColorClass(),
        className
      )}
      style={{ width: size, height: size }}
      title={`${getLevelName()} Context: ${context.displayName}`}
    />
  )
}

// Progress indicator showing context hierarchy position
export function ContextProgress({ className = "" }) {
  const { context } = useUnifiedContext()

  if (!context) {
    return null
  }

  // Determine progress based on context level depth
  const getProgress = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return { step: 1, total: 3, percentage: 33 }
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return { step: 2, total: 3, percentage: 66 }
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return { step: 3, total: 3, percentage: 100 }
      default:
        return { step: 1, total: 3, percentage: 33 }
    }
  }

  const progress = getProgress()

  const getColorClass = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return "bg-blue-500"
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return "bg-green-500"
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-24">
        <div 
          className={cn("h-1.5 rounded-full transition-all duration-300", getColorClass())}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-mono tabular-nums">
        {progress.step}/{progress.total}
      </span>
    </div>
  )
}