'use client'

import { 
  HomeIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  TrophyIcon,
  SparklesIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  LinkIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { 
    name: 'Business Intelligence', 
    href: '/dashboard/ai-intelligent', 
    icon: ChartPieIcon,
    description: 'Daily, weekly, monthly & yearly reports with 6-figure insights',
    badge: 'AI Enhanced'
  },
  { 
    name: 'AI Command Center', 
    href: '/dashboard/ai-command-center', 
    icon: ChatBubbleLeftRightIcon,
    description: 'LLM-style chat with all agents, conversation history & actions',
    badge: 'Live Chat'
  },
  { 
    name: 'Deep Analytics', 
    href: '/dashboard/analytics-enhanced', 
    icon: ChartBarIcon,
    description: 'Multi-dimensional analytics: Enterprise → Location → Barber',
    badge: 'Multi-Level'
  },
  { 
    name: 'Leaderboards & Coaching', 
    href: '/dashboard/leaderboard-gamified', 
    icon: TrophyIcon,
    description: 'Performance rankings, achievements & personalized coaching',
    badge: 'Gamified'
  }
]

const coreOperations = [
  { 
    name: 'Booking Calendar', 
    href: '/dashboard/bookings', 
    icon: CalendarDaysIcon,
    description: 'Manage appointments, view schedules, and handle bookings',
    badge: 'Core'
  },
  { 
    name: 'Customer Management', 
    href: '/dashboard/customers', 
    icon: UserGroupIcon,
    description: 'Client profiles, history, and relationship management'
  }
]

const barberOperations = [
  { 
    name: 'Barber Dashboard', 
    href: '/barber/dashboard', 
    icon: HomeIcon,
    description: 'Barber earnings, stats, and daily overview',
    badge: 'New'
  },
  { 
    name: 'My Schedule', 
    href: '/barber/schedule', 
    icon: CalendarDaysIcon,
    description: 'Manage your appointments and availability'
  },
  { 
    name: 'Booking Links & QR Codes', 
    href: '/barber/booking-links', 
    icon: LinkIcon,
    description: 'Create custom booking links with QR codes for client sharing',
    badge: 'New'
  },
  { 
    name: 'My Clients', 
    href: '/barber/clients', 
    icon: UserGroupIcon,
    description: 'View and manage your client relationships'
  }
]

const legacyPages = [
  { 
    name: 'Legacy Dashboard', 
    href: '/', 
    icon: HomeIcon,
    description: 'Original dashboard (deprecated)',
    isLegacy: true
  }
]

export default function Navigation() {
  const pathname = usePathname()
  
  // For development, we'll assume SHOP_OWNER role
  // In production, this would come from useAuth() context
  const userRole = 'SHOP_OWNER' // This would normally be: const { user } = useAuth() and user.role

  // Filter core operations based on role
  const filteredCoreOperations = coreOperations.filter(item => {
    // Customer Management is only for shop/enterprise owners
    if (item.name === 'Customer Management') {
      return ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
    }
    // Booking Calendar is available to all authenticated users
    return true
  })

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 w-80 fixed h-full flex flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">6FB AI System</h1>
            <p className="text-xs text-gray-500">Business Intelligence Platform</p>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <div className="px-4 py-4">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            AI-POWERED MODULES
          </h2>
        </div>
        
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            const isLegacy = item.isLegacy
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group block px-3 py-3 rounded-xl transition-all duration-200 hover:scale-105
                    ${isActive 
                      ? isLegacy 
                        ? 'bg-gray-100 shadow-sm' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-md' 
                      : 'hover:bg-gray-50'
                    }
                    ${isLegacy ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <item.icon
                      className={`
                        mt-0.5 h-5 w-5 flex-shrink-0
                        ${isActive 
                          ? isLegacy 
                            ? 'text-gray-500' 
                            : 'text-blue-600' 
                          : 'text-gray-400 group-hover:text-gray-600'
                        }
                      `}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          isActive 
                            ? isLegacy 
                              ? 'text-gray-700' 
                              : 'text-gray-900' 
                            : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {item.name}
                        </p>
                        {item.badge && !isLegacy && (
                          <span className={`
                            ml-2 px-2 py-1 text-xs font-medium rounded-full
                            ${isActive 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                        {isLegacy && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-500">
                            Legacy
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500 leading-tight">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Core Business Operations */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            CORE OPERATIONS
          </h2>
        </div>
        
        <ul className="space-y-2">
          {filteredCoreOperations.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group block px-3 py-3 rounded-xl transition-all duration-200 hover:scale-105
                    ${isActive 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-md' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <item.icon
                      className={`
                        mt-0.5 h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {item.name}
                        </p>
                        {item.badge && (
                          <span className={`
                            ml-2 px-2 py-1 text-xs font-medium rounded-full
                            ${isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500 leading-tight">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Barber Operations - Only show for barbers and owners */}
      {['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole) && (
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              BARBER OPERATIONS
            </h2>
          </div>
          
          <ul className="space-y-2">
            {barberOperations.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group block px-3 py-3 rounded-xl transition-all duration-200 hover:scale-105
                    ${isActive 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-md' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <item.icon
                      className={`
                        mt-0.5 h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {item.name}
                        </p>
                        {item.badge && (
                          <span className={`
                            ml-2 px-2 py-1 text-xs font-medium rounded-full
                            ${isActive 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500 leading-tight">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        </div>
      )}

      {/* Legacy Pages */}
      <div className="px-4 py-2">
        <ul className="space-y-1">
          {legacyPages.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group block px-3 py-2 rounded-lg transition-colors opacity-60
                    ${isActive ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate text-gray-600">
                          {item.name}
                        </p>
                        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-500">
                          Legacy
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-400 leading-tight">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      </div>

      {/* Settings - Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl z-50">
        <div className="p-4">
          <div className="mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              SYSTEM
            </h2>
          </div>
          <Link
            href="/dashboard/settings"
            className={`
              group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105
              ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                ? 'bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 shadow-md text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <Cog6ToothIcon
              className={`
                mr-3 h-5 w-5 flex-shrink-0
                ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                  ? 'text-slate-600' 
                  : 'text-gray-400 group-hover:text-gray-600'
                }
              `}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">Settings</p>
                <span className={`
                  ml-2 px-2 py-1 text-xs font-medium rounded-full
                  ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                    ? 'bg-slate-100 text-slate-700' 
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  System
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 leading-tight">
                Account preferences, notifications & system configuration
              </p>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}