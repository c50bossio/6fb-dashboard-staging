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

export default function OrganizedNavigation({ user, profile, onSignOut, isMobile = false }) {
  const pathname = usePathname()
  const [expandedCategories, setExpandedCategories] = useState(new Set(['overview']))
  const currentMatch = getCategoryByPath(pathname)

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

  return (
    <nav className="flex-1 space-y-2 px-2 py-4">
      {NAVIGATION_CATEGORIES.map((category) => {
        const isExpanded = expandedCategories.has(category.id)
        const visibleItems = getVisibleItems(category, profile?.role)
        const categoryColors = getCategoryColor(category.color)
        const hasActiveItem = currentMatch?.category.id === category.id

        return (
          <div key={category.id} className="space-y-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 ease-in-out
                ${hasActiveItem 
                  ? `${categoryColors.bg} ${categoryColors.text}` 
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <category.icon className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{category.name}</div>
                  {!isMobile && (
                    <div className="text-xs text-gray-500 font-normal">
                      {category.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {visibleItems.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {visibleItems.length}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </div>
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.isHome && pathname === '/dashboard')
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group flex items-center justify-between px-3 py-2 text-sm rounded-lg
                        transition-all duration-200 ease-in-out
                        ${isActive
                          ? `${categoryColors.accent} text-white shadow-sm`
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{item.name}</div>
                          {!isMobile && item.description && (
                            <div className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {item.badge && (
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded-full flex-shrink-0
                          ${isActive 
                            ? 'bg-white text-blue-600' 
                            : 'bg-blue-100 text-blue-600'
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* User Actions */}
      <div className="pt-4 mt-6 border-t border-gray-200">
        <div className="px-3 py-2">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {profile?.role?.replace('_', ' ') || 'Member'}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onSignOut}
          className="w-full mt-2 flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
          Sign out
        </button>
      </div>
    </nav>
  )
}