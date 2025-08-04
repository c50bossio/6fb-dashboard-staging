'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'
import { NAVIGATION_CATEGORIES, getCategoryByPath, getVisibleItems, getCategoryColor } from './NavigationConfig'

export default function OrganizedNavigation({ user, profile, onSignOut, isMobile = false, isCollapsed = false }) {
  const pathname = usePathname()
  const [expandedCategories, setExpandedCategories] = useState(new Set(['overview', 'ai-tools']))
  const [compactMode, setCompactMode] = useState(false)
  const currentMatch = getCategoryByPath(pathname)
  
  // Priority categories - always shown first and expanded by default
  const priorityCategories = ['overview', 'ai-tools', 'business']
  
  // Filter and prioritize categories
  const sortedCategories = [...NAVIGATION_CATEGORIES].sort((a, b) => {
    const aPriority = priorityCategories.indexOf(a.id)
    const bPriority = priorityCategories.indexOf(b.id)
    
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
    if (aPriority !== -1) return -1
    if (bPriority !== -1) return 1
    return 0
  })

  // Auto-expand current category
  if (currentMatch && !expandedCategories.has(currentMatch.category.id)) {
    setExpandedCategories(prev => new Set([...prev, currentMatch.category.id]))
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  if (isCollapsed) {
    // Collapsed sidebar - show only icons with tooltips
    return (
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAVIGATION_CATEGORIES.map((category) => {
          const visibleItems = getVisibleItems(category, profile?.role)
          const categoryColors = getCategoryColor(category.color)
          const hasActiveItem = currentMatch?.category.id === category.id

          return (
            <div key={category.id} className="space-y-1">
              {/* Collapsed Category Button */}
              <div className="relative group">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`
                    w-full flex items-center justify-center p-3 rounded-lg
                    transition-all duration-200 ease-in-out
                    ${hasActiveItem 
                      ? `${categoryColors.bg} ${categoryColors.text}` 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <category.icon className="h-5 w-5" />
                  {visibleItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {visibleItems.length}
                    </span>
                  )}
                </button>
                
                {/* Tooltip */}
                <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {category.name}
                </div>
              </div>

              {/* Collapsed Items - shown on category expansion */}
              {expandedCategories.has(category.id) && (
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.isHome && pathname === '/dashboard')
                    
                    return (
                      <div key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          className={`
                            flex items-center justify-center p-2 rounded-lg
                            transition-all duration-200 ease-in-out
                            ${isActive
                              ? `${categoryColors.accent} text-white shadow-sm`
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.badge && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                        
                        {/* Tooltip */}
                        <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                          {item.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      {/* Compact Mode Toggle */}
      <div className="mb-4 px-1">
        <button
          onClick={() => setCompactMode(!compactMode)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {compactMode ? '↕ Expand' : '↕ Compact'}
        </button>
      </div>
      
      <div className={compactMode ? 'space-y-0.5' : 'space-y-1'}>
      {sortedCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.id)
        const visibleItems = getVisibleItems(category, profile?.role)
        const categoryColors = getCategoryColor(category.color)
        const hasActiveItem = currentMatch?.category.id === category.id

        // Show fewer items for non-priority categories in compact mode
        const isSecondary = !priorityCategories.includes(category.id)
        const maxItems = compactMode && isSecondary ? 3 : visibleItems.length
        const displayItems = visibleItems.slice(0, maxItems)
        const hasMoreItems = visibleItems.length > maxItems

        return (
          <div key={category.id} className={compactMode ? 'space-y-0' : 'space-y-0.5'}>
            {/* Category Header - Adaptive */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={`
                w-full flex items-center justify-between rounded-lg
                transition-all duration-200 ease-in-out group
                ${compactMode 
                  ? 'px-2 py-1.5 text-xs font-medium' 
                  : 'px-3 py-2.5 text-sm font-semibold'
                }
                ${hasActiveItem 
                  ? `${categoryColors.bg} ${categoryColors.text}` 
                  : 'text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className={`flex items-center ${compactMode ? 'space-x-2' : 'space-x-3'}`}>
                <category.icon className={compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
                <span className={compactMode ? 'font-medium' : 'font-semibold'}>{category.name}</span>
                {visibleItems.length > 0 && (
                  <span className={`
                    text-xs font-medium rounded-full
                    ${compactMode ? 'px-1 py-0.5' : 'px-1.5 py-0.5'}
                    ${hasActiveItem 
                      ? 'bg-white/20 text-current' 
                      : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                    }
                  `}>
                    {compactMode && hasMoreItems ? `${displayItems.length}+` : visibleItems.length}
                  </span>
                )}
              </div>
              <div className="flex items-center">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 transition-transform" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 transition-transform" />
                )}
              </div>
            </button>

            {/* Category Items - Compact Adaptive Layout */}
            {isExpanded && (
              <div className={`ml-${compactMode ? '4' : '6'} ${compactMode ? 'space-y-0' : 'space-y-0.5'}`}>
                {displayItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.isHome && pathname === '/dashboard')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group flex items-center justify-between rounded-md
                        transition-all duration-200 ease-in-out
                        ${compactMode 
                          ? 'px-2 py-1 text-xs' 
                          : 'px-3 py-2 text-sm'
                        }
                        ${isActive
                          ? `${categoryColors.accent} text-white shadow-sm font-medium`
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className={`flex items-center min-w-0 flex-1 ${compactMode ? 'space-x-2' : 'space-x-3'}`}>
                        <item.icon className={`flex-shrink-0 ${compactMode ? 'h-3 w-3' : 'h-4 w-4'} ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className={`truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                          {item.name}
                        </span>
                      </div>
                      
                      {item.badge && !compactMode && (
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0
                          ${isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-blue-50 text-blue-600'
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
                
                {/* Show "More" indicator if items are truncated */}
                {hasMoreItems && compactMode && (
                  <button
                    onClick={() => setCompactMode(false)}
                    className="ml-5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    +{visibleItems.length - displayItems.length} more...
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      </div>

      {/* User Actions - Cleaner Design */}
      <div className="pt-3 mt-4 border-t border-gray-100">
        {isCollapsed ? (
          // Collapsed user actions - icon only
          <div className="space-y-1 px-2">
            <div className="relative group">
              <div className="flex items-center justify-center p-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </div>
            </div>
            
            <div className="relative group">
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
              <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Sign out
              </div>
            </div>
          </div>
        ) : (
          // Expanded user actions - Improved layout
          <>
            <div className="px-3 py-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                  </div>
                  <div className="text-xs font-medium text-gray-500 truncate uppercase tracking-wide">
                    {profile?.role?.replace('_', ' ') || 'Member'}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onSignOut}
              className="w-full mt-2 flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 group-hover:text-red-600" />
              <span className="font-medium">Sign out</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}