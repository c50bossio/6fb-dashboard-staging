'use client'

import React from 'react'
import { useAuth } from './SupabaseAuthProvider'
import ViewSwitcher from './ViewSwitcher'
import ThemeToggle, { ThemeToggleSimple } from './ui/ThemeToggle'
import {
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  CheckIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  LanguageIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const DashboardHeader = React.memo(function DashboardHeader() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null) // 'notifications', 'profile', or null

  // Refs for dropdown containers
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)

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

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdown &&
        !notificationsRef.current?.contains(event.target) &&
        !profileRef.current?.contains(event.target)
      ) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const getUserName = () => {
    // Priority 1: Profile full_name (database)
    if (profile?.full_name && profile.full_name !== 'User' && profile.full_name.trim() !== '') {
      return profile.full_name
    }

    // Priority 2: Profile first + last name (database)
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
    }

    // Priority 3: Google OAuth metadata (from user.user_metadata)
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }

    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }

    // Priority 4: Constructed from Google given/family names
    const givenName = user?.user_metadata?.given_name
    const familyName = user?.user_metadata?.family_name
    if (givenName || familyName) {
      return `${givenName || ''} ${familyName || ''}`.trim()
    }

    // Priority 5: Email prefix (non-generic)
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0]
      // Don't use if it looks like a generic email
      if (!emailPrefix.includes('test') && !emailPrefix.includes('demo')) {
        return emailPrefix
      }
    }

    // Priority 6: Loading state if we have a user but no profile yet
    if (user && !profile) {
      return 'Loading...'
    }

    return 'User'
  }

  const getUserRole = () => {
    const roleMap = {
      'CLIENT': 'Client',
      'BARBER': 'Barber',
      'SHOP_OWNER': 'Shop Owner',
      'ENTERPRISE_OWNER': 'Enterprise Owner',
      'SUPER_ADMIN': 'Administrator'
    }

    // Priority 1: Profile role (database)
    if (profile?.role) {
      return roleMap[profile.role] || 'User'
    }

    // Priority 2: User metadata role (OAuth)
    if (user?.user_metadata?.role) {
      return roleMap[user.user_metadata.role] || 'User'
    }

    // Priority 3: Loading state if we have a user but no profile yet
    if (user && !profile) {
      return 'Loading...'
    }

    return 'Client'
  }

  // Get the actual user role for permissions
  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  // Toggle dropdown handlers
  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown)
  }

  // Sample notifications data
  const notifications = [
    { id: 1, message: 'New booking from John Doe', time: '5 min ago', read: false },
    { id: 2, message: 'Payment received: $45.00', time: '1 hour ago', read: false },
    { id: 3, message: 'Schedule updated for tomorrow', time: '2 hours ago', read: true },
  ]

  const handleSignOut = async () => {
    try {
      console.log('🚪 Attempting to sign out...')
      setActiveDropdown(null) // Close dropdown immediately

      await signOut()

      // Clear any cached data
      localStorage.removeItem('supabase.auth.token')

      console.log('✅ Sign out successful, redirecting to login')
      router.push('/login')
    } catch (error) {
      console.error('❌ Error signing out:', error)
      // Still redirect to login even if there's an error
      router.push('/login')
    }
  }

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Greeting */}
          <div className="flex-shrink-0">
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Good {timeOfDay}, {getUserName()}!
              </h1>
              <p className="text-xs text-muted-foreground">
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

            {/* Theme Toggle */}
            <ThemeToggleSimple />

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => toggleDropdown('notifications')}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-card dark:ring-card" />
                )}
              </button>

              {activeDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-border hover:bg-muted ${!notif.read ? 'bg-olive-50 dark:bg-olive-900/20' : ''}`}>
                          <p className="text-sm text-foreground">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border">
                    <button className="text-sm text-olive-600 dark:text-olive-400 hover:text-olive-700 dark:hover:text-olive-300 font-medium w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>


            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => toggleDropdown('profile')}
                className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg transition-colors"
              >
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
                  <p className="text-sm font-medium text-foreground">{getUserName()}</p>
                  <p className="text-xs text-muted-foreground">{getUserRole()}</p>
                </div>
              </button>

              {activeDropdown === 'profile' && (
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{getUserName()}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || 'dev@localhost.com'}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </div>
                  <div className="border-t border-border py-2">
                    <Link
                      href="/dashboard/settings"
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-2" />
                      Open Full Settings
                    </Link>
                  </div>
                  <div className="border-t border-border">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
})

export default DashboardHeader