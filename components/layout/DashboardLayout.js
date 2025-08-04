'use client'

import { useState } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import OrganizedNavigation from '../navigation/OrganizedNavigation'
import QuickActionsBar from './QuickActionsBar'
import { Bars3Icon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function DashboardLayout({ children, showQuickActions = true }) {
  const { user, profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">6FB</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">AI Agent System</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <OrganizedNavigation 
              user={user} 
              profile={profile} 
              onSignOut={signOut}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-72'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo and collapse button */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-lg font-bold text-white">6FB</span>
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-gray-900 truncate">AI Agent System</h1>
                  <p className="text-xs text-gray-500 truncate">Barbershop Intelligence</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <OrganizedNavigation 
              user={user} 
              profile={profile} 
              onSignOut={signOut}
              isMobile={false}
              isCollapsed={sidebarCollapsed}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`h-full flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'
      }`}>
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            className="text-gray-700 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">6FB</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Dashboard</span>
          </div>
        </div>

        {/* Quick Actions Bar */}
        {showQuickActions && (
          <QuickActionsBar />
        )}

        {/* Page content - Viewport constrained */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}