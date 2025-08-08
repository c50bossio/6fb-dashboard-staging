'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CogIcon,
  BellIcon,
  ArrowLeftOnRectangleIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useAuth } from './SupabaseAuthProvider'

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        badge: null
      },
      {
        name: 'Calendar',
        href: '/dashboard/calendar',
        icon: CalendarIcon,
        badge: null
      }
    ]

    // Always show barber items for development
    baseItems.push(
      {
        name: 'Barber Dashboard',
        href: '/barber/dashboard',
        icon: CurrencyDollarIcon,
        badge: 'New'
      },
      {
        name: 'My Schedule',
        href: '/barber/schedule',
        icon: ClockIcon,
        badge: null
      },
      {
        name: 'My Clients',
        href: '/barber/clients',
        icon: UserGroupIcon,
        badge: null
      }
    )

    // Client booking items
    baseItems.push(
      {
        name: 'My Bookings',
        href: '/bookings',
        icon: ClipboardDocumentListIcon,
        badge: '2'
      },
      {
        name: 'Book Appointment',
        href: '/booking',
        icon: CalendarIcon,
        badge: null
      }
    )

    baseItems.push(
      {
        name: 'Analytics',
        href: '/dashboard/analytics',
        icon: ChartBarIcon,
        badge: null
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: CogIcon,
        badge: null
      }
    )

    return baseItems
  }

  const navigationItems = getNavigationItems()

  const isActive = (href) => pathname === href

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsOpen(true)}
            className="min-h-[44px] min-w-[44px] p-3 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">6FB</span>
            </div>
            <span className="font-semibold text-gray-900">Barbershop</span>
          </div>

          <button 
            className="relative min-h-[44px] min-w-[44px] p-3 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center"
            aria-label="View notifications"
          >
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="min-h-[44px] min-w-[44px] p-3 flex items-center justify-center"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">6FB</span>
                      </div>
                      <span className="font-semibold text-gray-900">Barbershop</span>
                    </div>
                  </div>

                  {/* User Profile Section */}
                  <div className="flex items-center space-x-3 px-2 py-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profile?.role || 'Customer'}
                      </p>
                    </div>
                  </div>

                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-2">
                      {navigationItems.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`
                              group flex items-center justify-between gap-x-3 rounded-lg px-3 py-3 text-sm font-medium
                              ${isActive(item.href)
                                ? 'bg-amber-50 text-amber-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            <div className="flex items-center gap-x-3">
                              <item.icon
                                className={`h-5 w-5 shrink-0 ${
                                  isActive(item.href) ? 'text-amber-600' : 'text-gray-400'
                                }`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </div>
                            {item.badge && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {/* Sign Out Button */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          await signOut()
                          setIsOpen(false)
                        }}
                        className="flex w-full items-center gap-x-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0 text-gray-400" />
                        Sign out
                      </button>
                    </div>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navigationItems.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg min-h-[44px] min-w-[44px] ${
                isActive(item.href)
                  ? 'text-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}