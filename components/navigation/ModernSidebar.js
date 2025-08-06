'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../SupabaseAuthProvider'
import { 
  BARBERSHOP_NAVIGATION, 
  QUICK_ACTIONS, 
  getActiveNavItem,
  NAVIGATION_THEMES 
} from './BarbershopNavigationConfig'
import { 
  ChevronRightIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ScissorsIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeSolid,
  CalendarDaysIcon as CalendarSolid,
  SparklesIcon as SparklesSolid
} from '@heroicons/react/24/solid'

export default function ModernSidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [expandedItems, setExpandedItems] = useState(new Set(['schedule']))
  const [activeItem, setActiveItem] = useState(null)

  useEffect(() => {
    const active = getActiveNavItem(pathname)
    setActiveItem(active)
    
    // Auto-expand parent of active item
    if (active?.main && active.main.children) {
      setExpandedItems(prev => new Set([...prev, active.main.id]))
    }
  }, [pathname])

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const NavItem = ({ item, isChild = false }) => {
    const isActive = activeItem?.main?.id === item.id || 
                    (isChild && activeItem?.sub?.href === item.href)
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0
    const theme = NAVIGATION_THEMES[item.id] || NAVIGATION_THEMES.operations

    return (
      <div className={isChild ? 'ml-4' : ''}>
        <div className="relative">
          {hasChildren && !isChild ? (
            <button
              onClick={() => toggleExpanded(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? `${theme.bg} ${theme.text} shadow-sm`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              {item.badge && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full mr-2 ${
                  item.badge === 'AI' ? 'bg-purple-100 text-purple-700' :
                  item.badge === 'Live' ? 'bg-green-100 text-green-700' :
                  item.badge === 'New' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.badge}
                </span>
              )}
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? `${theme.bg} ${theme.text} shadow-sm`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  item.badge === 'AI' ? 'bg-purple-100 text-purple-700' :
                  item.badge === 'Live' ? 'bg-green-100 text-green-700' :
                  item.badge === 'New' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          )}
          
          {/* Active indicator */}
          {isActive && !isChild && (
            <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 ${theme.accent} rounded-r-full`}></div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children.map((child) => (
              <NavItem key={child.href} item={child} isChild={true} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const QuickActionButton = ({ action }) => (
    <Link
      href={action.href}
      onClick={() => setIsOpen(false)}
      className={`flex items-center px-4 py-3 text-sm font-medium text-white rounded-lg transition-all duration-200 ${action.color}`}
    >
      <action.icon className="h-4 w-4 mr-3 flex-shrink-0" />
      <span>{action.name}</span>
    </Link>
  )

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-2">
              <ScissorsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">6FB Barbershop</h1>
              <p className="text-xs text-gray-500">Intelligence Dashboard</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 rounded-full p-2">
              <UserCircleIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.user_metadata?.full_name || 'Shop Owner'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'owner@6fbbarbershop.com'}
              </p>
            </div>
            <div className="flex space-x-1">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                <BellIcon className="h-4 w-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                <CogIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.slice(0, 4).map((action) => (
              <QuickActionButton key={action.name} action={action} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Navigation
          </div>
          <nav className="space-y-2">
            {BARBERSHOP_NAVIGATION.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}