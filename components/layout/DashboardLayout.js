'use client'

import { useState } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import OrganizedNavigation from '../navigation/OrganizedNavigation'
import QuickActionsBar from './QuickActionsBar'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function DashboardLayout({ children, showQuickActions = true }) {
  const { user, profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-lg font-bold text-white">6FB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Agent System</h1>
                <p className="text-xs text-gray-500">Barbershop Intelligence</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <OrganizedNavigation 
              user={user} 
              profile={profile} 
              onSignOut={signOut}
              isMobile={false}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
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

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}