'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  HomeIcon,
  MegaphoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: MegaphoneIcon },
  { name: 'Customers', href: '/dashboard/customers', icon: UserGroupIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon }
]

export default function DashboardNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Get user email from localStorage (replace with real auth)
    const email = localStorage.getItem('user_email')
    setUserEmail(email || '')
  }, [])

  const handleLogout = () => {
    // Clear auth data (replace with real auth logout)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_email')
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 w-64 fixed h-full z-10">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">6FB</span>
          </div>
          <h1 className="ml-3 text-lg font-bold text-gray-900">AI Dashboard</h1>
        </Link>
      </div>
      
      <div className="px-3 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* User Profile & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        {/* Agent Status */}
        <div className="flex items-center mb-4">
          <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="ml-2 text-xs text-gray-600">6 Agents Active</span>
        </div>

        {/* User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userEmail || 'User'}
              </p>
              <p className="text-xs text-gray-500">Barbershop Owner</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}