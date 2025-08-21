'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BuildingStorefrontIcon,
  ClockIcon,
  MapPinIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  UserGroupIcon,
  UsersIcon,
  BellIcon,
  ChartPieIcon,
  EnvelopeIcon,
  KeyIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const settingsGroups = [
  {
    id: 'business',
    name: 'Business Information',
    icon: BuildingStorefrontIcon,
    sections: [
      { id: 'general', name: 'General Info', icon: BuildingStorefrontIcon, path: '/shop/settings/general' },
      { id: 'hours', name: 'Business Hours', icon: ClockIcon, path: '/shop/settings/hours' },
      { id: 'location', name: 'Location', icon: MapPinIcon, path: '/shop/settings/location' },
      { id: 'tax', name: 'Tax & Compliance', icon: DocumentTextIcon, path: '/shop/settings/tax' }
    ]
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Cog6ToothIcon,
    sections: [
      { id: 'booking', name: 'Booking Rules', icon: CalendarDaysIcon, path: '/shop/settings/booking' },
      { id: 'appointments', name: 'Appointment Settings', icon: Cog6ToothIcon, path: '/shop/settings/appointments' },
      { id: 'services', name: 'Services', icon: ScissorsIcon, path: '/shop/services' },
      { id: 'products', name: 'Products', icon: ShoppingBagIcon, path: '/shop/products' }
    ]
  },
  {
    id: 'financial',
    name: 'Financial',
    icon: CreditCardIcon,
    sections: [
      { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon, path: '/shop/settings/payment' },
      { id: 'commission', name: 'Commissions', icon: ChartBarIcon, path: '/shop/financial' },
      { id: 'processing', name: 'Payment Processing', icon: BanknotesIcon, path: '/shop/settings/processing' }
    ]
  },
  {
    id: 'team',
    name: 'Team Management',
    icon: UserGroupIcon,
    sections: [
      { id: 'staff', name: 'Staff & Permissions', icon: UserGroupIcon, path: '/shop/settings/staff' },
      { id: 'barbers', name: 'Barber Management', icon: UsersIcon, path: '/shop/barbers' }
    ]
  },
  {
    id: 'communications',
    name: 'Communications',
    icon: BellIcon,
    sections: [
      { id: 'notifications', name: 'Notifications', icon: BellIcon, path: '/shop/settings/notifications' },
      { id: 'reports', name: 'Reports', icon: ChartPieIcon, path: '/shop/settings/reports' },
      { id: 'email', name: 'Email Templates', icon: EnvelopeIcon, path: '/shop/settings/email' }
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced',
    icon: KeyIcon,
    sections: [
      { id: 'api', name: 'API Keys', icon: KeyIcon, path: '/shop/settings/api' },
      { id: 'integrations', name: 'Integrations', icon: ArrowPathIcon, path: '/shop/settings/integrations' },
      { id: 'backup', name: 'Backup & Export', icon: CloudArrowUpIcon, path: '/shop/settings/backup' }
    ]
  },
  {
    id: 'system',
    name: 'System & Maintenance',
    icon: Cog6ToothIcon,
    sections: [
      { id: 'cache', name: 'Cache Management', icon: ArrowPathIcon, path: '/shop/settings/system/cache' }
    ]
  }
]

export default function SettingsSidebar({ onSectionChange }) {
  const [expandedGroups, setExpandedGroups] = useState(['business', 'operations'])
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSectionClick = (section) => {
    router.push(section.path)
    if (onSectionChange) {
      onSectionChange(section.id)
    }
    setIsMobileMenuOpen(false)
  }

  // Filter sections based on search query
  const filteredGroups = settingsGroups.map(group => ({
    ...group,
    sections: group.sections.filter(section =>
      section.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.sections.length > 0)

  const isActiveSection = (path) => {
    // Handle both exact matches and parent paths
    if (pathname === path) return true
    if (path === '/shop/settings/general' && pathname === '/shop/settings') return true
    return false
  }

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        ) : (
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        )}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-4">
          {/* Search */}
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-6 p-3 bg-olive-50 rounded-lg">
            <h3 className="text-sm font-semibold text-olive-900 mb-2">Quick Actions</h3>
            <div className="space-y-1">
              <button
                onClick={() => handleSectionClick({ id: 'hours', path: '/shop/settings/hours' })}
                className="w-full text-left text-sm text-olive-700 hover:text-olive-900 py-1"
              >
                → Update business hours
              </button>
              <button
                onClick={() => handleSectionClick({ id: 'payment', path: '/shop/settings/payment' })}
                className="w-full text-left text-sm text-olive-700 hover:text-olive-900 py-1"
              >
                → Configure payments
              </button>
              <button
                onClick={() => handleSectionClick({ id: 'staff', path: '/shop/settings/staff' })}
                className="w-full text-left text-sm text-olive-700 hover:text-olive-900 py-1"
              >
                → Manage staff permissions
              </button>
            </div>
          </div>

          {/* Settings Groups */}
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <group.icon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{group.name}</span>
                  </div>
                  {expandedGroups.includes(group.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {expandedGroups.includes(group.id) && (
                  <div className="bg-gray-50 px-2 py-2">
                    {group.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => handleSectionClick(section)}
                        className={`
                          w-full px-3 py-2 rounded-md flex items-center text-sm transition-colors
                          ${isActiveSection(section.path)
                            ? 'bg-olive-100 text-olive-900 font-medium'
                            : 'text-gray-700 hover:bg-white hover:text-gray-900'
                          }
                        `}
                      >
                        <section.icon className={`h-4 w-4 mr-2 ${
                          isActiveSection(section.path) ? 'text-olive-600' : 'text-gray-400'
                        }`} />
                        {section.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Need Help?</h3>
            <p className="text-xs text-gray-600 mb-2">
              Get assistance with your shop settings
            </p>
            <button className="text-xs text-olive-600 hover:text-olive-700 font-medium">
              View Documentation →
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}