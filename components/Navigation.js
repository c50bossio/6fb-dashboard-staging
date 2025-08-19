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
  UserPlusIcon,
  LinkIcon,
  QrCodeIcon,
  GlobeAltIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  PresentationChartLineIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PaintBrushIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  BuildingOffice2Icon,
  ScissorsIcon,
  ShoppingBagIcon,
  DocumentChartBarIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useNavigation } from '../contexts/NavigationContext'
import Logo, { LogoHeader } from './ui/Logo'

const navigation = [
  { 
    name: 'Main Dashboard', 
    href: '/dashboard', 
    icon: SparklesIcon,
    description: 'All-in-one intelligent business dashboard with AI insights & analytics',
    badge: 'NEW ✨',
    submodes: [
      { name: 'Executive Overview', mode: 'executive', icon: ChartPieIcon },
      { name: 'AI Insights', mode: 'ai_insights', icon: SparklesIcon },
      { name: 'Analytics', mode: 'analytics', icon: ChartBarIcon },
      { name: 'Predictive', mode: 'predictive', icon: PresentationChartLineIcon },
      { name: 'Operations', mode: 'operations', icon: Cog6ToothIcon }
    ]
  },
  { 
    name: 'AI Chat', 
    href: '/dashboard/ai-command-center', 
    icon: ChatBubbleLeftRightIcon,
    description: 'Interactive AI assistant with conversation history',
    badge: 'Chat'
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
    name: 'My Dashboard', 
    href: '/barber/dashboard', 
    icon: HomeIcon,
    description: 'Your earnings, stats, and daily overview'
  },
  { 
    name: 'Profile & Branding', 
    href: '/barber/profile', 
    icon: PaintBrushIcon,
    description: 'Customize your landing page and personal brand'
  },
  { 
    name: 'My Schedule', 
    href: '/barber/schedule', 
    icon: CalendarDaysIcon,
    description: 'Manage your appointments and availability'
  },
  { 
    name: 'My Clients', 
    href: '/barber/clients', 
    icon: UserGroupIcon,
    description: 'View and manage your client relationships'
  },
  { 
    name: 'Performance Reports', 
    href: '/barber/reports', 
    icon: ChartBarIcon,
    description: 'Track your earnings and performance metrics'
  },
  { 
    name: 'Booking Hub', 
    href: '/barber/booking-hub', 
    icon: LinkIcon,
    description: 'Manage all booking links, QR codes, embeds, and public page',
    badge: 'All-in-One'
  }
  // - My Services (manage your services and pricing)
  // - Financial Overview (detailed earnings and payouts)
  // - Product Sales (track product commissions)
]

const shopManagement = [
  { 
    name: 'Shop Dashboard', 
    href: '/shop/dashboard', 
    icon: BuildingStorefrontIcon,
    description: 'Multi-barber overview and shop analytics'
  },
  { 
    name: 'Website Customization', 
    href: '/shop/website', 
    icon: GlobeAltIcon,
    description: 'Customize your shop website and barber pages',
    badge: 'NEW'
  },
  { 
    name: 'Shop Settings', 
    href: '/shop/settings', 
    icon: Cog6ToothIcon,
    description: 'Configure shop details and preferences'
  },
  { 
    name: 'Add Barber', 
    href: '/shop/barbers/add', 
    icon: UserPlusIcon,
    description: 'Add new barbers to your team'
  },
  { 
    name: 'Financial Overview', 
    href: '/shop/financial', 
    icon: CurrencyDollarIcon,
    description: 'Commission settings and financial arrangements'
  },
  { 
    name: 'Product Inventory', 
    href: '/shop/products', 
    icon: CubeIcon,
    description: 'Manage product inventory'
  }
  // - Staff Management (manage all barbers)
  // - Point of Sale (process sales)
  // - Advanced Reports (detailed analytics)
]

const marketingOperations = [
  { 
    name: 'SEO Dashboard', 
    href: '/seo/dashboard', 
    icon: MegaphoneIcon,
    description: 'AI-powered SEO automation and competitive intelligence',
    badge: '🤖 AI'
  },
  { 
    name: 'Campaigns', 
    href: '/dashboard/campaigns', 
    icon: RocketLaunchIcon,
    description: 'Create and manage marketing campaigns'
  },
  { 
    name: 'Billing', 
    href: '/dashboard/billing', 
    icon: CreditCardIcon,
    description: 'Billing accounts, payment methods, and usage analytics'
  },
  { 
    name: 'Analytics', 
    href: '/dashboard/campaigns/analytics', 
    icon: DocumentChartBarIcon,
    description: 'Campaign performance and marketing analytics'
  }
]

const enterpriseOperations = [
  { 
    name: 'Enterprise Portal', 
    href: '/enterprise/website', 
    icon: BuildingOffice2Icon,
    description: 'Manage multi-location website and portal',
    badge: 'NEW'
  }
]
// - Enterprise Dashboard (multi-location overview)
// - Location Management (manage all shops)
// - Cross-Shop Analytics (performance comparison)

export default function Navigation() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useNavigation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true) // Default to mobile for SSR consistency
  const [currentTime, setCurrentTime] = useState('--:--') // Consistent initial state
  const [isClient, setIsClient] = useState(false)
  
  const userRole = 'SHOP_OWNER' // This would normally be: const { user } = useAuth() and user.role

  useEffect(() => {
    setIsClient(true)
    
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
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

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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

  const filteredCoreOperations = coreOperations.filter(item => {
    if (item.name === 'Customer Management') {
      return ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
    }
    return true
  })

  const MobileHeader = () => (
    <div className="lg:hidden bg-card border-b border-border px-4 py-0.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md h-12">
      <LogoHeader size="xsmall" showText={false} />
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/10 transition-all duration-200"
        aria-label="Open navigation menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
    </div>
  )

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
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? (isLegacy ? 'bg-gray-100 shadow-sm' : 'bg-gradient-to-r from-olive-50 to-gold-50 border border-olive-200 shadow-md') : 'hover:bg-gray-50'} ${isLegacy ? 'opacity-60' : ''}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive 
                          ? isLegacy 
                            ? 'text-gray-500' 
                            : 'text-olive-600' 
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
                              ? 'bg-olive-100 text-olive-700' 
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
                {/* Show submodes for Unified Dashboard - moved outside main Link */}
                {!collapsed && item.submodes && isActive && (
                  <div className="mt-2 ml-8 pl-2 space-y-1">
                    {item.submodes.map((submode) => (
                      <Link
                        key={submode.mode}
                        href={`${item.href}?mode=${submode.mode}`}
                        onClick={onItemClick}
                        className="flex items-center gap-2 text-xs text-gray-600 hover:text-olive-600 py-1"
                      >
                        <submode.icon className="h-3 w-3" />
                        <span>{submode.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
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
                              ? 'bg-moss-100 text-moss-800' 
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

      {/* Marketing Operations - Available to all authenticated users */}
      <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100`}>
        {!collapsed && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              MARKETING
            </h2>
          </div>
        )}
        
        <ul className="space-y-2">
          {marketingOperations.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? 'bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 shadow-md' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-pink-600' : 'text-gray-400 group-hover:text-gray-600'}
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
                              ? 'bg-pink-100 text-pink-700' 
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
          {!collapsed && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                BARBER OPERATIONS
              </h2>
            </div>
          )}
          
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
                        ${isActive ? 'text-amber-700' : 'text-gray-400 group-hover:text-gray-600'}
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

      {/* Shop Management - Only show for shop owners and above */}
      {['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole) && (
        <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100`}>
          {!collapsed && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                SHOP MANAGEMENT
              </h2>
            </div>
          )}
          
          <ul className="space-y-2">
            {shopManagement.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? 'bg-gradient-to-r from-indigo-50 to-olive-50 border border-indigo-200 shadow-md' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-olive-600' : 'text-gray-400 group-hover:text-gray-600'}
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
                              ? 'bg-indigo-100 text-olive-700' 
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

      {/* Enterprise Operations - Only show for enterprise owners */}
      {['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole) && (
        <div className={`${collapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100`}>
          {!collapsed && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                ENTERPRISE OPERATIONS
              </h2>
            </div>
          )}
          
          <ul className="space-y-2">
            {enterpriseOperations.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`group block ${collapsed ? 'px-2 py-2' : 'px-3 py-3'} rounded-xl transition-all duration-200 hover:scale-105 ${isActive ? 'bg-gradient-to-r from-gold-50 to-pink-50 border border-gold-200 shadow-md' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-start ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <item.icon
                      className={`
                        ${collapsed ? '' : 'mt-0.5'} h-5 w-5 flex-shrink-0
                        ${isActive ? 'text-gold-600' : 'text-gray-400 group-hover:text-gray-600'}
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
                              ? 'bg-gold-100 text-gold-700' 
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
          <div className="mobile-navigation absolute inset-y-0 left-0 w-80 max-w-full bg-card shadow-2xl transform transition-transform ease-in-out duration-300 border-r border-border">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <Logo size="medium" showText priority />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/10 transition-all duration-200"
                aria-label="Close navigation menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <NavigationItems onItemClick={() => setIsMobileMenuOpen(false)} />
              
              {/* Settings Section */}
              <div className="border-t border-border p-3 sticky bottom-0 bg-card backdrop-blur-sm">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                    ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                      ? 'bg-secondary/20 text-secondary-foreground shadow-md' 
                      : 'text-muted-foreground hover:bg-secondary/10 hover:text-foreground'
                    }
                  `}
                >
                  <Cog6ToothIcon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                        ? 'text-secondary' 
                        : 'text-muted-foreground group-hover:text-foreground'
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
        <nav className={`hidden lg:flex bg-card shadow-sm border-r border-border fixed h-full flex-col transition-all duration-300 backdrop-blur-md ${isCollapsed ? 'w-16' : 'w-80'}`}>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
            {/* Header */}
            <div className="p-6 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center ${isCollapsed ? 'hidden' : ''}`}>
                  <Logo size="medium" showText priority />
                </div>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`p-2 rounded-xl hover:bg-secondary/10 transition-all duration-200 ${isCollapsed ? 'mx-auto' : ''}`}
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? (
                    <ChevronDoubleRightIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <ChevronDoubleLeftIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            </div>
            
            <NavigationItems collapsed={isCollapsed} />
          </div>

          {/* Settings - Fixed at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border z-50 backdrop-blur-sm">
            <div className="p-3">
              <Link
                href="/dashboard/settings"
                className={`
                  group flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                    ? 'bg-secondary/20 text-secondary-foreground shadow-md' 
                    : 'text-muted-foreground hover:bg-secondary/10 hover:text-foreground'
                  }
                `}
              >
                <Cog6ToothIcon
                  className={`
                    ${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0
                    ${pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings')
                      ? 'text-secondary' 
                      : 'text-muted-foreground group-hover:text-foreground'
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