'use client'

import React, { Fragment, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  UserIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { cn } from '@/lib/utils'

/**
 * Unified Context Switcher - Single dropdown for all context switching
 * 
 * Replaces ViewSwitcher + GlobalContextSelector with enterprise-grade
 * context management following Stripe/Salesforce patterns
 * 
 * Features:
 * - Hierarchical context display (Organization > Location > Resource)
 * - Visual icons for each context level
 * - Smart grouping and filtering
 * - Keyboard navigation support
 * - Loading and error states
 */

export default function UnifiedContextSwitcher() {
  const {
    context,
    availableContexts,
    loading,
    error,
    setContext,
    userRole
  } = useUnifiedContext()

  const [isOpen, setIsOpen] = useState(false)

  // Don't show for users without context switching permissions (but allow fallback contexts)
  if (!context && !loading && availableContexts.length === 0 && !['SHOP_OWNER', 'ENTERPRISE_OWNER'].includes(userRole)) {
    return null
  }

  // Get display text for current context
  const getDisplayText = () => {
    if (!context) {
      return 'Select Context'
    }

    const parts = []
    
    if (context.metadata?.organizationName) {
      parts.push(context.metadata.organizationName)
    }
    
    if (context.metadata?.locationName) {
      parts.push(context.metadata.locationName)
    }
    
    if (context.metadata?.resourceName && context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
      parts.push(context.metadata.resourceName)
    }

    return parts.length > 0 ? parts.join(' > ') : context.displayName || 'Unknown Context'
  }

  // Get icon for context level
  const getContextIcon = (level) => {
    switch (level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return BuildingOfficeIcon
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return BuildingStorefrontIcon
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return UserIcon
      default:
        return UserIcon
    }
  }

  // Group contexts by level for better organization
  const groupedContexts = availableContexts.reduce((groups, ctx) => {
    if (!groups[ctx.level]) {
      groups[ctx.level] = []
    }
    groups[ctx.level].push(ctx)
    return groups
  }, {})

  // Order levels by hierarchy
  const levelOrder = [
    UNIFIED_CONTEXT_LEVELS.ORGANIZATION,
    UNIFIED_CONTEXT_LEVELS.LOCATION, 
    UNIFIED_CONTEXT_LEVELS.RESOURCE
  ]

  // Check if context is currently active
  const isContextActive = (ctx) => {
    if (!context) return false
    
    return context.level === ctx.level &&
           context.organizationId === ctx.organizationId &&
           context.locationId === ctx.locationId &&
           context.resourceId === ctx.resourceId
  }

  // Handle context selection
  const handleContextSelect = async (selectedContext) => {
    setIsOpen(false)
    
    if (isContextActive(selectedContext)) {
      return // Already selected
    }

    try {
      await setContext(selectedContext)
    } catch (error) {
      console.error('Failed to switch context:', error)
      // Error handling is managed by the context provider
    }
  }

  // Get level display name
  const getLevelDisplayName = (level) => {
    switch (level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return 'Organizations'
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return 'Locations'
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return 'Resources'
      default:
        return 'Contexts'
    }
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button 
          className={cn(
            "inline-flex items-center justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
            loading && "opacity-50 cursor-wait",
            error && "border-red-300 bg-red-50 text-red-700"
          )}
          disabled={loading}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {context && (
              <span className="flex-shrink-0">
                {React.createElement(getContextIcon(context.level), {
                  className: cn(
                    "h-4 w-4",
                    context.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION && "text-blue-600",
                    context.level === UNIFIED_CONTEXT_LEVELS.LOCATION && "text-green-600", 
                    context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE && "text-orange-600"
                  )
                })}
              </span>
            )}
            <span className="truncate text-left">
              {loading ? 'Loading...' : getDisplayText()}
            </span>
          </div>
          
          <ChevronDownIcon 
            className={cn(
              "ml-2 -mr-1 h-4 w-4 transition-transform duration-150",
              isOpen && "transform rotate-180"
            )} 
            aria-hidden="true" 
          />
        </Menu.Button>
      </div>

      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items 
          className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto"
          onClose={() => setIsOpen(false)}
        >
          <div className="py-1">
            {error && (
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2 text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {availableContexts.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-gray-500">
                {['SHOP_OWNER', 'ENTERPRISE_OWNER'].includes(userRole) ? (
                  <>
                    <p className="text-sm">Setting up your context...</p>
                    <p className="text-xs mt-1">Your barbershop contexts will appear here once configured</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">No contexts available</p>
                    <p className="text-xs mt-1">Contact your administrator for access</p>
                  </>
                )}
              </div>
            )}

            {levelOrder.map(level => {
              const contexts = groupedContexts[level]
              if (!contexts || contexts.length === 0) return null

              return (
                <div key={level} className="border-t border-gray-200 first:border-t-0">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      {React.createElement(getContextIcon(level), {
                        className: cn(
                          "h-4 w-4",
                          level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION && "text-blue-600",
                          level === UNIFIED_CONTEXT_LEVELS.LOCATION && "text-green-600",
                          level === UNIFIED_CONTEXT_LEVELS.RESOURCE && "text-orange-600"
                        )
                      })}
                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {getLevelDisplayName(level)}
                      </span>
                    </div>
                  </div>

                  {contexts.map((ctx) => {
                    const isActive = isContextActive(ctx)
                    
                    return (
                      <Menu.Item key={`${ctx.level}-${ctx.organizationId || ''}-${ctx.locationId || ''}-${ctx.resourceId || ''}`}>
                        {({ active }) => (
                          <button
                            onClick={() => handleContextSelect(ctx)}
                            className={cn(
                              "group flex items-center justify-between w-full px-4 py-2 text-sm text-left",
                              active && "bg-gray-100",
                              isActive && "bg-indigo-50 text-indigo-700"
                            )}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="flex-shrink-0">
                                {React.createElement(getContextIcon(ctx.level), {
                                  className: cn(
                                    "h-4 w-4",
                                    isActive ? "text-indigo-600" : "text-gray-400",
                                    ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION && !isActive && "text-blue-500",
                                    ctx.level === UNIFIED_CONTEXT_LEVELS.LOCATION && !isActive && "text-green-500",
                                    ctx.level === UNIFIED_CONTEXT_LEVELS.RESOURCE && !isActive && "text-orange-500"
                                  )
                                })}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "truncate font-medium",
                                  isActive ? "text-indigo-700" : "text-gray-900"
                                )}>
                                  {ctx.displayName}
                                </p>
                                
                                {(ctx.metadata?.locationName || ctx.metadata?.organizationName) && (
                                  <p className={cn(
                                    "truncate text-xs mt-0.5",
                                    isActive ? "text-indigo-600" : "text-gray-500"
                                  )}>
                                    {[
                                      ctx.metadata?.organizationName,
                                      ctx.metadata?.locationName !== ctx.displayName ? ctx.metadata?.locationName : null
                                    ].filter(Boolean).join(' • ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isActive && (
                              <CheckIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                            )}
                          </button>
                        )}
                      </Menu.Item>
                    )
                  })}
                </div>
              )
            })}

            {/* Quick actions footer */}
            {userRole === 'ENTERPRISE_OWNER' && (
              <div className="border-t border-gray-200 px-4 py-2">
                <p className="text-xs text-gray-500 text-center">
                  Switch contexts to view different scopes of data
                </p>
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

// Context level badge component for visual indicators
export function ContextLevelBadge({ level, className = "" }) {
  const getIcon = () => {
    switch (level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return { icon: BuildingOfficeIcon, color: "text-blue-600", bg: "bg-blue-100" }
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return { icon: BuildingStorefrontIcon, color: "text-green-600", bg: "bg-green-100" }
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return { icon: UserIcon, color: "text-orange-600", bg: "bg-orange-100" }
      default:
        return { icon: UserIcon, color: "text-gray-600", bg: "bg-gray-100" }
    }
  }

  const { icon, color, bg } = getIcon()

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
      bg,
      color,
      className
    )}>
      {React.createElement(icon, { className: "h-3 w-3 mr-1" })}
      {level.toLowerCase()}
    </span>
  )
}