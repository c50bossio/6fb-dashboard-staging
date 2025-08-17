'use client'

import { 
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  MoonIcon,
  SunIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../SupabaseAuthProvider'

export default function DashboardHeader() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000)
    
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true')
    }
    
    return () => clearInterval(interval)
  }, [])

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
    return profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
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

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown)
  }

  const notifications = [
    { id: 1, message: 'New booking from John Doe', time: '5 min ago', read: false },
    { id: 2, message: 'Payment received: $45.00', time: '1 hour ago', read: false },
    { id: 3, message: 'Schedule updated for tomorrow', time: '2 hours ago', read: true },
  ]

  const handleSignOut = async () => {
    setActiveDropdown(null)
    
    const result = await signOut()
    
    if (result && result.success) {
      console.log('✅ Sign out successful')
    } else {
      console.log('⚠️ Sign out may have issues, but auth provider will handle cleanup')
    }
  }

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

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
            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => toggleDropdown('notifications')}
                className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>
              
              {activeDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${!notif.read ? 'bg-olive-50' : ''}`}>
                          <p className="text-sm text-gray-900">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No new notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <button className="text-sm text-olive-600 hover:text-olive-700 font-medium w-full text-center">
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
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
                  {(profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                    <img 
                      src={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} 
                      alt={getUserName()}
                      className="h-8 w-8 rounded-full object-cover"
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
              
              {activeDropdown === 'profile' && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{getUserName()}</p>
                    <p className="text-xs text-gray-500">{profile?.email || user?.email || 'dev@localhost.com'}</p>
                  </div>
                  <div className="py-2">
                    <Link 
                      href="/profile"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                    <button 
                      onClick={handleDarkModeToggle}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        {darkMode ? <MoonIcon className="h-4 w-4 mr-2" /> : <SunIcon className="h-4 w-4 mr-2" />}
                        Dark Mode
                      </span>
                      <span className="text-xs text-gray-500">{darkMode ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-200 py-2">
                    <Link 
                      href="/dashboard/settings#payments"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                      </svg>
                      Payment Setup
                    </Link>
                    <button 
                      onClick={() => {
                        setActiveDropdown(null)
                        // Dispatch a custom event to trigger onboarding
                        const event = new CustomEvent('launchOnboarding', { 
                          detail: { forced: true }
                        })
                        window.dispatchEvent(event)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Launch Onboarding
                    </button>
                    <Link 
                      href="/dashboard/settings"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-gray-200">
                    <button 
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
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
}