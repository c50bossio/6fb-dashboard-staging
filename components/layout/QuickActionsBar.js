'use client'

import { 
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState } from 'react'

import { useAuth } from '../SupabaseAuthProvider'


const QUICK_ACTIONS = [
  {
    id: 'ai-chat',
    name: 'Start AI Chat',
    description: 'Ask your AI assistant',
    href: '/dashboard/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'purple',
    shortcut: 'C'
  },
  {
    id: 'booking',
    name: 'New Booking',
    description: 'Schedule appointment',
    href: '/dashboard/bookings',
    icon: CalendarDaysIcon,
    color: 'blue',
    shortcut: 'B'
  },
  {
    id: 'analytics',
    name: 'View Analytics',
    description: 'Check performance',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    color: 'green',
    shortcut: 'A'
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Manage clients',
    href: '/dashboard/customers',
    icon: UserGroupIcon,
    color: 'orange',
    shortcut: 'U'
  }
]

const getColorClasses = (color, variant = 'default') => {
  const colors = {
    purple: {
      default: 'bg-purple-600 hover:bg-purple-700 text-white',
      light: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
      border: 'border-purple-200'
    },
    blue: {
      default: 'bg-blue-600 hover:bg-blue-700 text-white',
      light: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      border: 'border-blue-200'
    },
    green: {
      default: 'bg-green-600 hover:bg-green-700 text-white',
      light: 'bg-green-50 text-green-700 hover:bg-green-100',
      border: 'border-green-200'
    },
    orange: {
      default: 'bg-orange-600 hover:bg-orange-700 text-white',
      light: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
      border: 'border-orange-200'
    }
  }
  return colors[color]?.[variant] || colors.blue[variant]
}

export default function QuickActionsBar() {
  const { profile } = useAuth()
  const [showMore, setShowMore] = useState(false)

  // Filter actions based on user role
  const visibleActions = QUICK_ACTIONS.filter(action => {
    // All users can access basic actions
    return true
  })

  return (
    <div className="sticky top-0 lg:top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Quick Actions */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap mr-2">
              Quick Actions:
            </span>
            
            {visibleActions.slice(0, 3).map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`
                  inline-flex items-center px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
                  transition-all duration-200 ease-in-out whitespace-nowrap min-w-0
                  ${getColorClasses(action.color, 'default')}
                  transform hover:scale-105 shadow-sm hover:shadow-md
                  touch-manipulation
                `}
              >
                <action.icon className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline truncate">{action.name}</span>
                <span className="sm:hidden truncate text-xs">{action.name.split(' ')[0]}</span>
                {action.shortcut && (
                  <kbd className="ml-2 hidden lg:inline-block px-1.5 py-0.5 bg-white bg-opacity-20 text-xs rounded">
                    ⌘{action.shortcut}
                  </kbd>
                )}
              </Link>
            ))}

            {/* More Actions Button */}
            {visibleActions.length > 3 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                More
              </button>
            )}
          </div>

          {/* User Context */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <SparklesIcon className="h-4 w-4 text-purple-500" />
              <span>AI Assistant Ready</span>
            </div>
            
            {profile?.shop_name && (
              <div className="hidden lg:block text-sm">
                <span className="text-gray-500">Managing:</span>
                <span className="ml-1 font-medium text-gray-900">{profile.shop_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded More Actions */}
        {showMore && (
          <div className="pb-3 border-t border-gray-100 pt-3 mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {visibleActions.slice(3).map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className={`
                    flex items-center p-2 rounded-lg text-sm
                    transition-colors ${getColorClasses(action.color, 'light')}
                  `}
                  onClick={() => setShowMore(false)}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">{action.name}</div>
                    <div className="text-xs opacity-75">{action.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}