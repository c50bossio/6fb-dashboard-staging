'use client'

import { useState } from 'react'
import { 
  Bars3Icon, 
  MagnifyingGlassIcon, 
  MoonIcon,
  SunIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const Header = ({ 
  onMenuClick, 
  className = '',
  showSearch = true,
  showNotifications = true,
  showThemeToggle = true 
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className={clsx(
      "glass-header px-4 py-3 sticky top-0 z-40",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left side - Menu and Search */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="btn-ghost btn-sm"
            aria-label="Toggle menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          
          {showSearch && (
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-text-tertiary dark:text-text-dark-tertiary" />
              </div>
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(
                  "input pl-10 w-64 lg:w-80",
                  "bg-background-secondary/50 dark:bg-background-dark-secondary/50",
                  "border-mono-200/50 dark:border-mono-700/50",
                  "text-body-sm"
                )}
              />
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Search button for mobile */}
          {showSearch && (
            <button className="btn-ghost btn-sm sm:hidden">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          )}
          
          {showThemeToggle && (
            <button 
              onClick={toggleTheme}
              className="btn-ghost btn-sm"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          )}
          
          {showNotifications && (
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="btn-ghost btn-sm relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                3
              </span>
            </button>
          )}
          
          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={clsx(
                "flex items-center space-x-2 btn-ghost btn-md",
                "hover:bg-mono-100 dark:hover:bg-mono-800"
              )}
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-soft">
                <UserCircleIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-body-sm font-medium hidden sm:inline-block">
                Demo User
              </span>
            </button>
            
            {showProfileMenu && (
              <>
                {/* Mobile overlay */}
                <div 
                  className="fixed inset-0 z-30 lg:hidden"
                  onClick={() => setShowProfileMenu(false)}
                />
                
                {/* Dropdown Menu */}
                <div className={clsx(
                  "absolute right-0 mt-2 w-56 z-40",
                  "card shadow-large animate-scale-up"
                )}>
                  <div className="p-3 border-b border-mono-200 dark:border-mono-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-body-sm font-medium text-text-default dark:text-text-dark-default">
                          Demo User
                        </p>
                        <p className="text-body-xs text-text-secondary dark:text-text-dark-secondary">
                          demo@example.com
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <button 
                      className={clsx(
                        "flex items-center w-full px-3 py-2 text-body-sm",
                        "text-text-secondary dark:text-text-dark-secondary",
                        "hover:text-text-default dark:hover:text-text-dark-default",
                        "hover:bg-mono-50 dark:hover:bg-mono-800",
                        "transition-colors duration-150"
                      )}
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-3" />
                      Profile Settings
                    </button>
                    
                    <button 
                      className={clsx(
                        "flex items-center w-full px-3 py-2 text-body-sm",
                        "text-error-600 dark:text-error-400",
                        "hover:bg-error-50 dark:hover:bg-error-900/20",
                        "transition-colors duration-150"
                      )}
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header