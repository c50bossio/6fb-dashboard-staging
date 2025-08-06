'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../SupabaseAuthProvider'
import { 
  ChevronRightIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { NAVIGATION_CATEGORIES, getCategoryByPath, getVisibleItems, getCategoryColor } from './NavigationConfig'

export default function HierarchicalSidebar({ collapsed: initialCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [expandedCategories, setExpandedCategories] = useState(new Set(['overview', 'business'])) // Default expanded
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()

  // Don't show on auth-related pages
  const authPaths = ['/login', '/register', '/', '/login-v2', '/login-simple', '/login-api', '/login-options', '/test-auth']
  if (authPaths.includes(pathname) || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const isItemActive = (href) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/'
    }
    return pathname.startsWith(href)
  }

  const isCategoryActive = (category) => {
    return category.items.some(item => isItemActive(item.href))
  }

  const currentPageInfo = getCategoryByPath(pathname)

  const sidebarWidth = collapsed ? 'w-16' : 'w-72'
  const contentMargin = collapsed ? 'ml-16' : 'ml-72'

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out hidden lg:flex lg:flex-col`}>
        {/* Logo and Collapse Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">6FB</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Barbershop AI
              </span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-1">
            {NAVIGATION_CATEGORIES.map((category) => {
              const visibleItems = getVisibleItems(category, profile?.role)
              const isActive = isCategoryActive(category)
              const isExpanded = expandedCategories.has(category.id)
              const colors = getCategoryColor(category.color)

              if (visibleItems.length === 0) return null

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => !collapsed && toggleCategory(category.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={collapsed ? category.name : ''}
                  >
                    <category.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{category.name}</span>
                        {visibleItems.length > 1 && (
                          <span className="ml-2">
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </button>

                  {/* Category Items */}
                  {!collapsed && isExpanded && visibleItems.length > 1 && (
                    <div className="ml-6 space-y-1">
                      {visibleItems.map((item) => {
                        const itemActive = isItemActive(item.href)
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              itemActive
                                ? `${colors.bg} ${colors.text}`
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="ml-3">{item.name}</span>
                            {item.badge && (
                              <span className={`ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                itemActive ? 'bg-white text-gray-700' : `${colors.accent} text-white`
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* Single item categories or collapsed state */}
                  {(collapsed || visibleItems.length === 1) && visibleItems.map((item) => {
                    if (collapsed) {
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isItemActive(item.href)
                              ? `${colors.bg} ${colors.text}`
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title={item.name}
                        >
                          <item.icon className="h-5 w-5" />
                        </Link>
                      )
                    }
                    return null
                  })}
                </div>
              )
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            {collapsed ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {profile?.role?.replace('_', ' ') || 'Member'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <BellIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Sign out"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">6FB</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Barbershop AI
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Mobile Navigation Content */}
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <nav className="px-2">
                  {NAVIGATION_CATEGORIES.map((category) => {
                    const visibleItems = getVisibleItems(category, profile?.role)
                    const colors = getCategoryColor(category.color)

                    if (visibleItems.length === 0) return null

                    return (
                      <div key={category.id} className="mb-6">
                        <div className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide ${colors.text}`}>
                          {category.name}
                        </div>
                        <div className="mt-2 space-y-1">
                          {visibleItems.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`group flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                                isItemActive(item.href)
                                  ? `${colors.bg} ${colors.text}`
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <item.icon className="h-5 w-5 mr-3" />
                              {item.name}
                              {item.badge && (
                                <span className={`ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isItemActive(item.href) ? 'bg-white text-gray-700' : `${colors.accent} text-white`
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </nav>
              </div>

              {/* Mobile User Profile */}
              {user && (
                <div className="flex-shrink-0 border-t border-gray-200 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-white">
                        {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-800">
                        {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {profile?.role?.replace('_', ' ') || 'Member'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation (Desktop) */}
      {!collapsed && currentPageInfo && (
        <div className={`hidden lg:block ${contentMargin} transition-all duration-300 ease-in-out`}>
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <div>
                    <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
                      Home
                    </Link>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
                    <span className="ml-4 text-sm font-medium text-gray-500">
                      {currentPageInfo.category.name}
                    </span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400" />
                    <span className="ml-4 text-sm font-medium text-gray-900">
                      {currentPageInfo.item.name}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}