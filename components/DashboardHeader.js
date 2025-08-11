'use client'

import { useAuth } from './SupabaseAuthProvider'
import ViewSwitcher from './ViewSwitcher'
import { 
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function DashboardHeader() {
  const { user, profile } = useAuth()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    // Set time of day greeting
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')

    // Update current time
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  const getUserName = () => {
    return profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  }

  const getUserRole = () => {
    const roleMap = {
      'CLIENT': 'Client',
      'BARBER': 'Barber',
      'SHOP_OWNER': 'Shop Owner',
      'ENTERPRISE_OWNER': 'Enterprise Owner',
      'SUPER_ADMIN': 'Administrator'
    }
    
    const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'
    return roleMap[userRole] || 'User'
  }

  // Get the actual user role for permissions
  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Greeting */}
          <div className="flex-shrink-0">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Good {timeOfDay}, {getUserName()}!
              </h1>
              <p className="text-xs text-gray-500">
                {getUserRole()} • {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })} • {currentTime}
              </p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {/* View Switcher - Only for management roles */}
            {['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole) && (
              <ViewSwitcher />
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </button>

            {/* Settings */}
            <Link 
              href="/dashboard/settings"
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </Link>

            {/* User Profile */}
            <div className="flex items-center">
              <button className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt={getUserName()}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <UserCircleIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">{getUserName()}</p>
                  <p className="text-xs text-gray-500">{getUserRole()}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}