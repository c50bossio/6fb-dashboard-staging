'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { cn } from '@/lib/utils'

/**
 * Context Breadcrumbs - Shows hierarchical navigation path
 * 
 * Displays: Organization > Location > Resource
 * Each segment is clickable to navigate to that context level
 */

export default function ContextBreadcrumbs({ className = "" }) {
  const { context, setContext } = useUnifiedContext()

  // Don't show if no context or only one level
  if (!context || !context.breadcrumbs || context.breadcrumbs.length <= 1) {
    return null
  }

  const handleBreadcrumbClick = async (breadcrumb, index) => {
    // Don't navigate if it's the current/last breadcrumb
    if (index === context.breadcrumbs.length - 1) {
      return
    }

    // Build context object for the clicked breadcrumb
    const newContext = {
      level: breadcrumb.level,
      displayName: breadcrumb.name
    }

    // Add appropriate IDs based on level
    switch (breadcrumb.level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        newContext.organizationId = breadcrumb.id
        newContext.metadata = {
          organizationName: breadcrumb.name
        }
        break
        
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        newContext.organizationId = context.organizationId
        newContext.locationId = breadcrumb.id
        newContext.metadata = {
          organizationName: context.metadata?.organizationName,
          locationName: breadcrumb.name
        }
        break
        
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        newContext.organizationId = context.organizationId
        newContext.locationId = context.locationId
        newContext.resourceId = breadcrumb.id
        newContext.metadata = {
          organizationName: context.metadata?.organizationName,
          locationName: context.metadata?.locationName,
          resourceName: breadcrumb.name,
          resourceType: context.metadata?.resourceType
        }
        break
    }

    try {
      await setContext(newContext)
    } catch (error) {
      console.error('Failed to navigate to breadcrumb context:', error)
    }
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-gray-500", className)} aria-label="Context breadcrumb">
      {context.breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === context.breadcrumbs.length - 1
        const isClickable = !isLast

        return (
          <div key={`${breadcrumb.level}-${breadcrumb.id}`} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" aria-hidden="true" />
            )}
            
            {isClickable ? (
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb, index)}
                className={cn(
                  "hover:text-gray-700 transition-colors duration-150 focus:outline-none focus:underline",
                  breadcrumb.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION && "text-blue-600 hover:text-blue-800",
                  breadcrumb.level === UNIFIED_CONTEXT_LEVELS.LOCATION && "text-green-600 hover:text-green-800",
                  breadcrumb.level === UNIFIED_CONTEXT_LEVELS.RESOURCE && "text-orange-600 hover:text-orange-800"
                )}
                title={`Switch to ${breadcrumb.name}`}
              >
                {breadcrumb.name}
              </button>
            ) : (
              <span className="text-gray-900 font-medium">
                {breadcrumb.name}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}