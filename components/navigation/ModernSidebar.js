'use client'

import { 
  ChevronRightIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import Logo from '../ui/Logo'

import { useAuth } from '../SupabaseAuthProvider'


import { BARBERSHOP_NAVIGATION, getActiveNavItem } from './BarbershopNavigationConfig'
// import MobileHeader from './MobileHeader'

export default function ModernSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState(new Set(['schedule', 'business']))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Don't show on auth-related pages
  const authPaths = ['/login', '/register', '/', '/login-v2', '/login-simple', '/login-api', '/login-options', '/test-auth']
  if (authPaths.includes(pathname) || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const isItemActive = (href) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/'
    }
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    console.log('🚪 Sidebar: Starting sign out...')
    const result = await signOut()
    console.log('📤 Sidebar sign out result:', result)
    // Let the auth provider handle the redirect to avoid conflicts
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-72'

  return (
    <>
      {/* Mobile Header - inline implementation */}

      {/* Desktop Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out hidden lg:flex lg:flex-col`}>
        {/* Logo and Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center">
              <Logo size="small" showText={false} />
            </Link>
          )}
          
          {collapsed && (
            <Link href="/dashboard" className="flex justify-center">
              <Logo size="small" showText={false} />
            </Link>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="min-h-[44px] min-w-[44px] p-3 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-2">
            {BARBERSHOP_NAVIGATION.map((item) => {
              const isActive = isItemActive(item.href)
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expandedSections.has(item.id)
              const Icon = item.icon

              return (
                <div key={item.id}>
                  {/* Main Navigation Item */}
                  <div className="relative">
                    {hasChildren ? (
                      <button
                        onClick={() => !collapsed && toggleSection(item.id)}
                        className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all group ${
                          isActive
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${
                          isActive ? 'text-amber-700' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        
                        {!collapsed && (
                          <>
                            <span className="ml-3 flex-1 text-left">{item.name}</span>
                            {item.badge && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium bg-olive-100 text-olive-700 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            <ChevronRightIcon className={`ml-2 h-4 w-4 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`} />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all group ${
                          isActive
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${
                          isActive ? 'text-amber-700' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        
                        {!collapsed && (
                          <>
                            <span className="ml-3">{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto px-2 py-1 text-xs font-medium bg-olive-100 text-olive-700 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )}
                  </div>

                  {/* Sub-navigation */}
                  {hasChildren && isExpanded && !collapsed && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const childActive = isItemActive(child.href)
                        const ChildIcon = child.icon

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors group ${
                              childActive
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <ChildIcon className={`h-4 w-4 flex-shrink-0 ${
                              childActive ? 'text-amber-700' : 'text-gray-400 group-hover:text-gray-500'
                            }`} />
                            <span className="ml-2 flex-1">{child.name}</span>
                            {child.badge && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                child.badge === 'Live' ? 'bg-moss-100 text-moss-800' :
                                child.badge === 'AI' ? 'bg-gold-100 text-gold-700' :
                                child.badge === 'New' ? 'bg-olive-100 text-olive-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {child.badge}
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
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile?.role || 'BARBER'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="fixed inset-y-0 left-0 flex w-full max-w-sm">
            <div className="flex flex-col w-full bg-white">
              {/* Mobile Header */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
                <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                  <Logo size="small" showText={false} />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-4 py-4 overflow-y-auto">
                <div className="space-y-2">
                  {BARBERSHOP_NAVIGATION.map((item) => {
                    const isActive = isItemActive(item.href)
                    const hasChildren = item.children && item.children.length > 0
                    const isExpanded = expandedSections.has(item.id)
                    const Icon = item.icon

                    return (
                      <div key={item.id}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleSection(item.id)}
                            className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg ${
                              isActive
                                ? 'bg-amber-50 text-amber-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                            <span className="ml-3 flex-1 text-left">{item.name}</span>
                            {item.badge && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium bg-olive-100 text-olive-700 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            <ChevronRightIcon className={`ml-2 h-4 w-4 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`} />
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg ${
                              isActive
                                ? 'bg-amber-50 text-amber-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                            <span className="ml-3">{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto px-2 py-1 text-xs font-medium bg-olive-100 text-olive-700 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )}

                        {hasChildren && isExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.children.map((child) => {
                              const childActive = isItemActive(child.href)
                              const ChildIcon = child.icon

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center px-3 py-2 text-sm rounded-md ${
                                    childActive
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <ChildIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                  <span className="ml-2 flex-1">{child.name}</span>
                                  {child.badge && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      child.badge === 'Live' ? 'bg-moss-100 text-moss-800' :
                                      child.badge === 'AI' ? 'bg-gold-100 text-gold-700' :
                                      child.badge === 'New' ? 'bg-olive-100 text-olive-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {child.badge}
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
                </div>
              </nav>

              {/* Mobile User Profile */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profile?.role || 'BARBER'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}