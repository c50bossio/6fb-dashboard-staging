'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../SupabaseAuthProvider'

export default function AdminHeader({ title, user, onRefresh, refreshing }) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const navigationItems = [
    { name: 'Subscriptions', href: '/admin/subscriptions', current: true },
    { name: 'Users', href: '/admin/users', current: false },
    { name: 'Support', href: '/admin/support', current: false },
    { name: 'Analytics', href: '/admin/analytics', current: false },
    { name: 'Settings', href: '/admin/settings', current: false }
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Admin Badge */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Admin Dashboard</div>
                  <div className="text-xs text-gray-500">Super Administrator</div>
                </div>
              </div>
              
              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
              
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
          </div>

          {/* Center navigation (hidden on small screens) */}
          <div className="hidden lg:flex lg:space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? 'bg-softred-100 text-softred-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-olive-500 ${
                refreshing ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <svg 
                className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-olive-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5A9.98 9.98 0 0118 10a8 8 0 10-16 0c0 2.21.895 4.21 2.343 5.657L1 19h5m9-2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="sr-only">View notifications</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">Admin</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/admin/profile')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Admin Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/admin/audit-log')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Audit Log
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/admin/system-health')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      System Health
                    </button>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/dashboard')
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Back to User Dashboard
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation (shown on small screens) */}
      <div className="lg:hidden border-t border-gray-200 px-4 py-3">
        <div className="flex space-x-4 overflow-x-auto">
          {navigationItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                item.current
                  ? 'bg-softred-100 text-softred-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}