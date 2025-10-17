'use client'

import React from 'react'
import { 
  InformationCircleIcon, 
  EyeIcon, 
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { cn } from '@/lib/utils'

/**
 * Context Banner - Warning/info banner showing filtered/scoped view
 * 
 * Appears when user is viewing a specific context (not default view)
 * Shows what data is being filtered and provides option to clear
 */

export default function ContextBanner({ 
  className = "",
  dismissible = true,
  variant = "info" // "info", "warning", "success"
}) {
  const { context, availableContexts, setContext } = useUnifiedContext()

  // Don't show if no specific context is active or if it's the default view
  if (!context) {
    return null
  }

  // Determine if this is a filtered/scoped view that deserves a banner
  const shouldShowBanner = () => {
    // Show banner for resource-level views (individual barber/service data)
    if (context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
      return true
    }

    // Show banner for location views when user can access organization level
    if (context.level === UNIFIED_CONTEXT_LEVELS.LOCATION) {
      const hasOrgLevelAccess = availableContexts.some(ctx => 
        ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION
      )
      return hasOrgLevelAccess
    }

    // Don't show for organization level (typically the highest/default view)
    return false
  }

  if (!shouldShowBanner()) {
    return null
  }

  // Get banner configuration based on context level
  const getBannerConfig = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return {
          icon: BuildingOfficeIcon,
          color: "blue",
          title: "Organization View",
          message: `Viewing data for ${context.metadata?.organizationName || 'your organization'}`
        }
        
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return {
          icon: BuildingStorefrontIcon,
          color: "green", 
          title: "Location View",
          message: `Viewing data for ${context.metadata?.locationName || 'this location'} only`
        }
        
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return {
          icon: UserIcon,
          color: "orange",
          title: context.metadata?.resourceType === 'BARBER' ? "Barber View" : "Resource View",
          message: `Viewing ${context.metadata?.resourceName || 'individual'} data only`
        }
        
      default:
        return {
          icon: InformationCircleIcon,
          color: "gray",
          title: "Filtered View",
          message: "You're viewing filtered data"
        }
    }
  }

  const config = getBannerConfig()

  // Get CSS classes based on color and variant
  const getBannerStyles = (color, variant) => {
    const styles = {
      info: {
        blue: "bg-blue-50 border-blue-200 text-blue-800",
        green: "bg-green-50 border-green-200 text-green-800", 
        orange: "bg-orange-50 border-orange-200 text-orange-800",
        gray: "bg-gray-50 border-gray-200 text-gray-800"
      },
      warning: {
        blue: "bg-blue-100 border-blue-300 text-blue-900",
        green: "bg-green-100 border-green-300 text-green-900",
        orange: "bg-orange-100 border-orange-300 text-orange-900", 
        gray: "bg-gray-100 border-gray-300 text-gray-900"
      },
      success: {
        blue: "bg-blue-50 border-blue-200 text-blue-700",
        green: "bg-green-50 border-green-200 text-green-700",
        orange: "bg-orange-50 border-orange-200 text-orange-700",
        gray: "bg-gray-50 border-gray-200 text-gray-700"
      }
    }

    return styles[variant]?.[color] || styles.info.gray
  }

  // Handle clearing the context (go to broader view)
  const handleClearContext = async () => {
    try {
      // Find a broader context to switch to
      let broaderContext = null

      if (context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
        // Switch to location view if available
        broaderContext = availableContexts.find(ctx => 
          ctx.level === UNIFIED_CONTEXT_LEVELS.LOCATION &&
          ctx.locationId === context.locationId
        )
      }

      if (!broaderContext && context.level !== UNIFIED_CONTEXT_LEVELS.ORGANIZATION) {
        // Switch to organization view if available
        broaderContext = availableContexts.find(ctx => 
          ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION &&
          ctx.organizationId === context.organizationId
        )
      }

      if (broaderContext) {
        await setContext(broaderContext)
      }
    } catch (error) {
      console.error('Failed to clear context:', error)
    }
  }

  // Get clear button text
  const getClearButtonText = () => {
    if (context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
      return context.metadata?.locationName ? `View ${context.metadata.locationName}` : "View Location"
    }
    if (context.level === UNIFIED_CONTEXT_LEVELS.LOCATION) {
      return context.metadata?.organizationName ? `View ${context.metadata.organizationName}` : "View Organization"
    }
    return "View All"
  }

  const canClearContext = availableContexts.some(ctx => {
    if (context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
      return ctx.level === UNIFIED_CONTEXT_LEVELS.LOCATION || ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION
    }
    if (context.level === UNIFIED_CONTEXT_LEVELS.LOCATION) {
      return ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION
    }
    return false
  })

  return (
    <div className={cn(
      "border rounded-md px-4 py-3 mb-4",
      getBannerStyles(config.color, variant),
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <config.icon className="h-5 w-5 flex-shrink-0" />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <EyeIcon className="h-4 w-4" />
              <span className="font-medium text-sm">
                {config.title}
              </span>
            </div>
            <p className="text-sm mt-1">
              {config.message}
              {canClearContext && (
                <span className="ml-1">
                  - <button 
                    onClick={handleClearContext}
                    className="underline hover:no-underline font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded"
                  >
                    {getClearButtonText()}
                  </button> to see all data
                </span>
              )}
            </p>
          </div>
        </div>

        {dismissible && canClearContext && (
          <button
            onClick={handleClearContext}
            className="flex-shrink-0 ml-4 p-1 rounded-md hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
            title={`Clear filter - ${getClearButtonText()}`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function ContextBannerCompact({ className = "" }) {
  const { context } = useUnifiedContext()

  if (!context || context.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION) {
    return null
  }

  const getIcon = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return <BuildingStorefrontIcon className="h-4 w-4 text-green-600" />
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return <UserIcon className="h-4 w-4 text-orange-600" />
      default:
        return <InformationCircleIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const getDisplayText = () => {
    switch (context.level) {
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return `📍 ${context.metadata?.locationName || 'Location View'}`
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return `👤 ${context.metadata?.resourceName || 'Individual View'}`
      default:
        return "🔍 Filtered View"
    }
  }

  return (
    <div className={cn(
      "inline-flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700",
      className
    )}>
      {getIcon()}
      <span>{getDisplayText()}</span>
    </div>
  )
}