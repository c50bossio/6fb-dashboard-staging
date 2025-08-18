'use client'

import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  AcademicCapIcon,
  SparklesIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from './SupabaseAuthProvider'


const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Staff', href: '/staff', icon: UserCircleIcon },
  { name: 'Reviews', href: '/dashboard/reviews', icon: ChatBubbleLeftRightIcon,
    subItems: [
      { name: 'All Reviews', href: '/dashboard/reviews' },
      { name: 'Location Reviews', href: '/dashboard/locations/reviews' },
      { name: 'Enterprise Analytics', href: '/dashboard/enterprise/reviews' }
    ]
  },
  { name: 'Payments', href: '/payments', icon: BanknotesIcon },
  { name: 'Analytics', href: '/dashboard?mode=analytics', icon: ChartBarIcon },
  { name: 'AI Agents', href: '/ai-agents', icon: SparklesIcon },
  { name: 'Advanced RAG', href: '/advanced-rag', icon: AcademicCapIcon },
  { name: 'Admin: AI Knowledge', href: '/admin/knowledge', icon: CogIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
]

export default function GlobalNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const pathname = usePathname()

  const authPaths = ['/login', '/register', '/', '/login-v2', '/login-simple', '/login-api', '/login-options', '/test-auth']
  if (authPaths.includes(pathname) || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-olive-600 to-gold-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">6FB</span>
                </div>
                <span className="hidden sm:block text-xl font-semibold text-gray-900">
                  Barbershop AI
                </span>
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-olive-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right side - user menu and mobile menu button */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button 
              className="min-h-[44px] min-w-[44px] p-3 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="View notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>

            {/* User menu */}
            {user && (
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gradient-to-br from-olive-600 to-gold-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {profile?.role?.replace('_', ' ') || 'Member'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 text-base font-medium transition-colors ${
                    active
                      ? 'bg-olive-50 border-r-4 border-olive-500 text-olive-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Mobile user section */}
          {user && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-3">
                <div className="h-10 w-10 bg-gradient-to-br from-olive-600 to-gold-600 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {(profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile?.role?.replace('_', ' ') || 'Member'}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={signOut}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}