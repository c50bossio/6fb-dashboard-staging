'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { getBreadcrumbs } from './BarbershopNavigationConfig'
import { 
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ScissorsIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function MobileHeader({ onMenuClick, showSearch = false }) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const [showNotifications, setShowNotifications] = useState(false)

  const mockNotifications = [
    {
      id: 1,
      type: 'appointment',
      title: 'John Smith checked in',
      message: '10:30 AM appointment with Marcus',
      time: '2 min ago',
      unread: true
    },
    {
      id: 2,
      type: 'reminder',
      title: 'Confirmation needed',
      message: '3 appointments need confirmation calls',
      time: '5 min ago',
      unread: true
    },
    {
      id: 3,
      type: 'revenue',
      title: 'Daily target achieved',
      message: "Today's revenue: $420 (105% of target)",
      time: '1 hour ago',
      unread: false
    }
  ]

  return (
    <div className="bg-white border-b border-gray-200 lg:ml-72">
      {/* Main Header */}
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Left Side - Menu & Breadcrumbs */}
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Logo (Mobile) */}
            <div className="flex items-center space-x-2 lg:hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-1.5">
                <ScissorsIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">6FB</span>
            </div>

            {/* Breadcrumbs (Desktop) */}
            <nav className="hidden lg:flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                  )}
                  <span className={`${
                    index === breadcrumbs.length - 1
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                    {crumb.name}
                  </span>
                </div>
              ))}
            </nav>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Search Button (Mobile) */}
            {showSearch && (
              <button className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            )}

            {/* Search Bar (Desktop) */}
            {showSearch && (
              <div className="hidden lg:block">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers, appointments..."
                    className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 relative"
              >
                <BellIcon className="h-5 w-5" />
                {mockNotifications.filter(n => n.unread).length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {mockNotifications.filter(n => n.unread).length}
                  </div>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Mark all read
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {mockNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.type === 'appointment' ? 'bg-green-500' :
                            notification.type === 'reminder' ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100">
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden sm:block text-sm font-medium">Demo User</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Breadcrumbs */}
      <div className="lg:hidden px-4 pb-3">
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
              )}
              <span className={`${
                index === breadcrumbs.length - 1
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-500'
              }`}>
                {crumb.name}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Close notifications when clicking outside */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  )
}