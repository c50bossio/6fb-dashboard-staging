'use client'

import { Menu, Transition } from '@headlessui/react'
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
  SparklesIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, Fragment } from 'react'

import { useGlobalDashboard } from '../contexts/GlobalDashboardContext'
import { useSubscription } from '../hooks/useSubscription'
import { getDisplayName, getInitials } from '../lib/name-utils'
import { useAuth } from './SupabaseAuthProvider'

// Role-based navigation configuration
const getNavigationItems = (userRole, permissions) => {
  const baseItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarIcon },
  ]
  
  // Enterprise Owner navigation
  if (userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN') {
    return [
      ...baseItems,
      { name: 'Locations', href: '/enterprise/locations', icon: UsersIcon },
      { name: 'Analytics', href: '/enterprise/analytics', icon: ChartBarIcon },
      { name: 'Customers', href: '/dashboard/customers', icon: UsersIcon },
      { name: 'Reviews', href: '/dashboard/reviews', icon: ChatBubbleLeftRightIcon,
        subItems: [
          { name: 'All Reviews', href: '/dashboard/reviews' },
          { name: 'Location Reviews', href: '/dashboard/locations/reviews' },
          { name: 'Enterprise Analytics', href: '/dashboard/enterprise/reviews' }
        ]
      },
      { name: 'AI Insights', href: '/dashboard?mode=ai_insights', icon: SparklesIcon },
      { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
    ]
  }
  
  // Shop Owner navigation
  if (userRole === 'SHOP_OWNER') {
    return [
      ...baseItems,
      { name: 'Barbers', href: '/shop/barbers', icon: UserCircleIcon },
      { name: 'Customers', href: '/dashboard/customers', icon: UsersIcon },
      { name: 'Analytics', href: '/shop/analytics', icon: ChartBarIcon },
      { name: 'Financial', href: '/shop/financial', icon: BanknotesIcon },
      { name: 'AI Coach', href: '/dashboard?mode=ai_insights', icon: SparklesIcon },
      { name: 'Settings', href: '/shop/settings', icon: CogIcon },
    ]
  }
  
  // Barber navigation
  if (userRole === 'BARBER') {
    return [
      ...baseItems,
      { name: 'My Clients', href: '/barber/clients', icon: UsersIcon },
      { name: 'My Schedule', href: '/barber/schedule', icon: CalendarIcon },
      { name: 'My Performance', href: '/barber/dashboard', icon: ChartBarIcon },
      { name: 'Profile', href: '/barber/profile', icon: UserCircleIcon },
    ]
  }
  
  // Customer navigation
  if (userRole === 'CLIENT' || userRole === 'CUSTOMER') {
    return [
      { name: 'Book Appointment', href: '/bookings', icon: CalendarIcon },
      { name: 'My Appointments', href: '/appointments', icon: CalendarIcon },
      { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    ]
  }
  
  // Default navigation for unknown roles
  return baseItems
}

export default function GlobalNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, signOut, userRole } = useAuth()
  const { permissions } = useGlobalDashboard()
  const { subscription, loading: subscriptionLoading, openBillingPortal } = useSubscription()
  const pathname = usePathname()
  
  // Get role-specific navigation items
  const navigation = getNavigationItems(userRole, permissions)

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
              <Menu as="div" className="relative hidden md:block">
                <Menu.Button className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 bg-gradient-to-br from-olive-600 to-gold-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {getInitials({
                        firstName: profile?.firstName || profile?.first_name,
                        lastName: profile?.lastName || profile?.last_name,
                        fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name
                      })}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {getDisplayName({
                        firstName: profile?.firstName || profile?.first_name,
                        lastName: profile?.lastName || profile?.last_name,
                        fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name,
                        email: user?.email,
                        defaultName: 'User'
                      })}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      {subscription?.tier ? `${subscription.tier} Plan` : 'Member'}
                      {subscription?.status === 'active' && (
                        <span className="ml-1 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                      )}
                    </div>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-80 origin-top-right divide-y divide-gray-100 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {/* User Info Section */}
                    <div className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-olive-600 to-gold-600 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-white">
                            {getInitials({
                              firstName: profile?.firstName || profile?.first_name,
                              lastName: profile?.lastName || profile?.last_name,
                              fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name
                            })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getDisplayName({
                              firstName: profile?.firstName || profile?.first_name,
                              lastName: profile?.lastName || profile?.last_name,
                              fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name,
                              email: user?.email,
                              defaultName: 'User'
                            })}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Section */}
                    {!subscriptionLoading && subscription && (
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {subscription.tier ? `${subscription.tier} Plan` : 'Free Plan'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {subscription.status === 'active' && subscription.daysRemaining 
                                ? `${subscription.daysRemaining} days remaining`
                                : subscription.status || 'Inactive'
                              }
                            </p>
                          </div>
                          <div className="flex items-center">
                            {subscription.status === 'active' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {subscription.status || 'Inactive'}
                              </span>
                            )}
                          </div>
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={openBillingPortal}
                              className={`${
                                active ? 'bg-olive-50 text-olive-700' : 'text-gray-700'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}
                            >
                              <CreditCardIcon className="mr-2 h-4 w-4" />
                              Manage Subscription
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={`${
                              active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                            } group flex items-center px-4 py-2 text-sm transition-colors`}
                          >
                            <UserCircleIcon className="mr-3 h-4 w-4" />
                            Profile Settings
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/dashboard/billing"
                            className={`${
                              active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                            } group flex items-center px-4 py-2 text-sm transition-colors`}
                          >
                            <CreditCardIcon className="mr-3 h-4 w-4" />
                            Billing & Usage
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={signOut}
                            className={`${
                              active ? 'bg-red-50 text-red-700' : 'text-gray-700'
                            } group flex w-full items-center px-4 py-2 text-sm transition-colors`}
                          >
                            <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                            Sign Out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
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
                    {getInitials({
                      firstName: profile?.firstName || profile?.first_name,
                      lastName: profile?.lastName || profile?.last_name,
                      fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name
                    })}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {getDisplayName({
                      firstName: profile?.firstName || profile?.first_name,
                      lastName: profile?.lastName || profile?.last_name,
                      fullName: profile?.fullName || profile?.full_name || user?.user_metadata?.full_name,
                      email: user?.email,
                      defaultName: 'User'
                    })}
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