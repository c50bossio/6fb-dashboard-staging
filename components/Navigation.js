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
  QrCodeIcon,
  GlobeAltIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  PresentationChartLineIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useNavigation } from '../contexts/NavigationContext'

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
  },
  { 
    name: 'Predictive Analytics', 
    href: '/predictive-analytics', 
    icon: PresentationChartLineIcon,
    description: 'AI-powered revenue forecasting, demand prediction & pricing optimization',
    badge: 'Forecasting'
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
    name: 'Website Settings', 
    href: '/dashboard/website-settings', 
    icon: GlobeAltIcon,
    description: 'Customize your website, branding, colors, and content',
    badge: 'Customize'
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
  },
  { 
    name: 'Public Booking Page', 
    href: '/barber/public-booking', 
    icon: EyeIcon,
    description: 'Preview and share your customized public booking page',
    badge: 'SEO Ready'
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
  const { isCollapsed, setIsCollapsed } = useNavigation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true) // Default to mobile for SSR consistency
  const [currentTime, setCurrentTime] = useState('--:--') // Consistent initial state
  const [isClient, setIsClient] = useState(false)
  
  // For development, we'll assume SHOP_OWNER role
  // In production, this would come from useAuth() context
  const userRole = 'SHOP_OWNER' // This would normally be: const { user } = useAuth() and user.role

  // Client-side only initialization
  useEffect(() => {
    setIsClient(true)
    
    // Detect mobile screen size
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    // Update time every second - only after client hydration
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime() // Set initial time
    const timeInterval = setInterval(updateTime, 1000)
    
    return () => {
      window.removeEventListener('resize', checkIsMobile)
      clearInterval(timeInterval)
    }
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isClient) return // Only run after client hydration
    
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.mobile-navigation')) {
        setIsMobileMenuOpen(false)
      }
    }
    
    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen, isClient])

  // Filter core operations based on role
  const filteredCoreOperations = coreOperations.filter(item => {
    // Customer Management is only for shop/enterprise owners
    if (item.name === 'Customer Management') {
      return ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
    }
    // Booking Calendar is available to all authenticated users
    return true
  })

  // Mobile Header Component
  const MobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center">
        <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <SparklesIcon className="h-5 w-5 text-white" />
        </div>
        <div className="ml-3">
          <h1 className="text-lg font-bold text-gray-900">6FB AI</h1>
        </div>
      </div>
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Open navigation menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
    </div>
  )

  // Navigation Items Component (reusable for both desktop and mobile)
  const NavigationItems = ({ onItemClick = () => {}, collapsed = false }) => (
    <>
      {/* Main Navigation */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4`}>
        {!collapsed && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            AI-POWERED MODULES
            </h2>
          </div>
        )}
        
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            const isLegacy = item.isLegacy
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? (isLegacy ? 'bg-gray-100 shadow-sm' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-md') : 'hover:bg-gray-50'} ${isLegacy ? 'opacity-60' : ''}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive 
                          ? isLegacy 
                            ? 'text-gray-500' 
                            : 'text-blue-600' 
                          : 'text-gray-400 group-hover:text-gray-600'
                        }
                      `}
                      title={collapsed ? item.name : undefined}
                    />
                    {!collapsed && (
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
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Core Business Operations */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100`}>
        {!collapsed && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            CORE OPERATIONS
            </h2>
          </div>
        )}
        
        <ul className="space-y-2">
          {filteredCoreOperations.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-md' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `}
                      title={collapsed ? item.name : undefined}
                    />
                    {!collapsed && (
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
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Barber Operations - Only show for barbers and owners */}
      {['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole) && (
        <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100`}>
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
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-md' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `}
                      title={collapsed ? item.name : undefined}
                    />
                    {!collapsed && (
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
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        </div>
      )}

      {/* Legacy Pages */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-2`}>
        <ul className="space-y-1">
          {legacyPages.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-2'} rounded-lg transition-colors opacity-60 ${isActive ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon className={`${collapsed ? '' : 'mt-0.5'} h-4 w-4 flex-shrink-0 text-gray-400`} title={collapsed ? item.name : undefined} />
                    {!collapsed && (
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
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header - Only render after client hydration to prevent mismatch */}
      {isClient && <MobileHeader />}
      
      {/* Mobile Navigation Overlay */}
      {isClient && isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Slide-out Menu */}
          <div className="mobile-navigation absolute inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl transform transition-transform ease-in-out duration-300">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">6FB AI System</h1>
                  <p className="text-xs text-gray-500">Business Intelligence Platform</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Close navigation menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <NavigationItems onItemClick={() => setIsMobileMenuOpen(false)} />
              
              {/* Settings Section */}
              <div className="border-t border-gray-100 p-3 sticky bottom-0 bg-white">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Cog6ToothIcon
                    className={`
                      mr-2 h-4 w-4 flex-shrink-0
                      ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                        ? 'text-slate-600' 
                        : 'text-gray-400 group-hover:text-gray-600'
                      }
                    `}
                  />
                  <span className="truncate">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation - Only render after client hydration to prevent mismatch */}
      {isClient && (
        <nav className={`hidden lg:flex bg-white shadow-sm border-r border-gray-200 fixed h-full flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`}>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center ${isCollapsed ? 'hidden' : ''}`}>
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-gray-900">6FB AI System</h1>
                    <p className="text-xs text-gray-500">Business Intelligence Platform</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? (
                    <ChevronDoubleRightIcon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronDoubleLeftIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            <NavigationItems collapsed={isCollapsed} />
          </div>

          {/* Settings - Fixed at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="p-3">
              <Link
                href="/dashboard/settings"
                className={`
                  group flex items-center ${isCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Cog6ToothIcon
                  className={`
                    ${isCollapsed ? '' : 'mr-2'} h-4 w-4 flex-shrink-0
                    ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                      ? 'text-slate-600' 
                      : 'text-gray-400 group-hover:text-gray-600'
                    }
                  `}
                  title={isCollapsed ? 'Settings' : undefined}
                />
                {!isCollapsed && <span className="truncate">Settings</span>}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </>
  )
}