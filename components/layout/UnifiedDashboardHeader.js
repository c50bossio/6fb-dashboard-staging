'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import UnifiedContextSelector from '../shared/UnifiedContextSelector'
import { MobileContextIndicator } from '../shared/UnifiedContextSelector'

export default function UnifiedDashboardHeader({ 
  title,
  subtitle,
  children,
  showContextSelector = true,
  customQuickActions = null 
}) {
  const pathname = usePathname()
  const { activeContext, contextLoading, getPageDefaults } = useGlobalDashboard()
  
  // Determine current page type from pathname
  const getCurrentPageType = () => {
    if (pathname.includes('/calendar')) return 'calendar'
    if (pathname.includes('/analytics')) return 'analytics'
    if (pathname.includes('/staff') || pathname.includes('/team')) return 'staff'
    if (pathname.includes('/customers')) return 'customers'
    if (pathname.includes('/services')) return 'services'
    if (pathname.includes('/shop')) return 'shop'
    return 'general'
  }
  
  const pageType = getCurrentPageType()
  const pageDefaults = getPageDefaults(pageType)
  
  // Get context-appropriate title if not provided
  const getContextualTitle = () => {
    if (title) return title
    
    if (!activeContext) return 'Dashboard'
    
    const pageTitles = {
      calendar: 'Calendar & Appointments',
      analytics: 'Analytics & Reports',
      staff: 'Staff Management',
      customers: 'Customer Management', 
      services: 'Services & Pricing',
      shop: 'Shop Settings',
      general: 'Dashboard'
    }
    
    return pageTitles[pageType] || 'Dashboard'
  }
  
  // Get context-appropriate subtitle
  const getContextualSubtitle = () => {
    if (subtitle) return subtitle
    if (!activeContext) return null
    
    const contextDescriptions = {
      executive: 'Executive Overview',
      manager: 'Location Management',
      personal: 'Personal Dashboard',
      booking: 'Booking Interface'
    }
    
    return contextDescriptions[activeContext.contextType]
  }
  
  return (
    <>
      {/* Mobile Context Indicator */}
      <MobileContextIndicator />
      
      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Title and Context */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">
                  {getContextualTitle()}
                </h1>
                {getContextualSubtitle() && (
                  <p className="text-sm text-gray-500 truncate">
                    {getContextualSubtitle()}
                  </p>
                )}
              </div>
            </div>
            
            {/* Right side - Context Selector and Actions */}
            <div className="flex items-center space-x-4">
              {showContextSelector && (
                <UnifiedContextSelector
                  showQuickActions={true}
                  quickActions={customQuickActions || pageDefaults?.quickActions}
                  size="default"
                />
              )}
              
              {/* Additional custom content */}
              {children}
            </div>
          </div>
        </div>
        
        {/* Loading bar when context is switching */}
        {contextLoading && (
          <div className="h-1 bg-gray-100">
            <div className="h-1 bg-olive-500 animate-pulse" style={{
              animation: 'loading-bar 1.5s ease-in-out infinite'
            }}></div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </>
  )
}

// Page-specific header variants
export function CalendarHeader({ children, ...props }) {
  return (
    <UnifiedDashboardHeader
      title="Calendar & Appointments"
      customQuickActions={['Today', 'This Week', 'Available Now', '+ New Appointment']}
      {...props}
    >
      {children}
    </UnifiedDashboardHeader>
  )
}

export function AnalyticsHeader({ children, ...props }) {
  return (
    <UnifiedDashboardHeader
      title="Analytics & Reports"
      customQuickActions={['Today', 'This Week', 'This Month', 'Custom Range']}
      {...props}
    >
      {children}
    </UnifiedDashboardHeader>
  )
}

export function StaffHeader({ children, ...props }) {
  return (
    <UnifiedDashboardHeader
      title="Staff Management"
      customQuickActions={['Active Staff', 'Schedules', 'Performance', '+ Add Staff']}
      {...props}
    >
      {children}
    </UnifiedDashboardHeader>
  )
}

export function CustomersHeader({ children, ...props }) {
  return (
    <UnifiedDashboardHeader
      title="Customer Management"
      customQuickActions={['Recent', 'Regulars', 'No-Shows', '+ Add Customer']}
      {...props}
    >
      {children}
    </UnifiedDashboardHeader>
  )
}

export function ServicesHeader({ children, ...props }) {
  return (
    <UnifiedDashboardHeader
      title="Services & Pricing"
      customQuickActions={['Active Services', 'Categories', 'Pricing', '+ Add Service']}
      {...props}
    >
      {children}
    </UnifiedDashboardHeader>
  )
}

// Context-aware status indicator component
export function ContextStatusIndicator() {
  const { activeContext, contextualData } = useGlobalDashboard()
  
  if (!activeContext) return null
  
  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      {/* Location indicator */}
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>{activeContext.locationName}</span>
      </div>
      
      {/* Quick stats */}
      {contextualData?.analytics && (
        <div className="hidden lg:flex items-center space-x-4">
          {contextualData.analytics.todayAppointmentCount !== undefined && (
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
              {contextualData.analytics.todayAppointmentCount} today
            </span>
          )}
          {contextualData.analytics.activeStaff !== undefined && (
            <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
              {contextualData.analytics.activeStaff} staff
            </span>
          )}
        </div>
      )}
    </div>
  )
}