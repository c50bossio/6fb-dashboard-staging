'use client'

import { 
  ArrowPathIcon, 
  BellIcon, 
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import React from 'react'

import { useTenant } from '@/contexts/TenantContext'
import Button from '../Button'
import { Badge } from '../ui'


const DashboardHeader = React.memo(function DashboardHeader({ 
  user, 
  profile, 
  onRefresh, 
  systemHealth,
  dashboardStats 
}) {
  const { tenant, tenantName, businessName, subscriptionTier } = useTenant()
  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours()
    
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getLastLoginTime = () => {
    if (profile?.last_login_at) {
      const lastLogin = new Date(profile.last_login_at)
      return lastLogin.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }
    return 'First login'
  }

  return (
    <div className="bg-gradient-to-br from-indigo-600 via-gold-600 to-olive-700 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-black/10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="relative px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Main header content */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 min-w-0">
            {/* Greeting and user info */}
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight text-white drop-shadow-sm">
                {getCurrentTimeGreeting()}, {profile?.full_name || user?.user_metadata?.full_name || 'User'}! 👋
              </h1>
              <div className="flex items-center text-olive-100 text-base sm:text-lg leading-relaxed">
                <BuildingStorefrontIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{businessName || tenantName || 'Your AI-powered barbershop is running smoothly'}</span>
              </div>
            </div>

            {/* User context and badges - Enhanced styling */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                <span className="text-sm font-semibold text-white">
                  {profile?.role?.replace('_', ' ').toUpperCase() || 'SHOP OWNER'}
                </span>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1.5 rounded-full shadow-lg">
                <span className="text-xs font-bold text-white tracking-wide">
                  {subscriptionTier?.toUpperCase() || 'PROFESSIONAL'}
                </span>
              </div>
              
              {tenant && (
                <div className="bg-olive-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-olive-300/30">
                  <span className="text-xs font-semibold text-olive-100">
                    ID: {tenant.id.split('_').pop()}
                  </span>
                </div>
              )}
              
              <div className="hidden sm:flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-white/90 text-sm">
                <ClockIcon className="h-4 w-4 mr-2" />
                Last login: {getLastLoginTime()}
              </div>
            </div>

            {/* Quick stats preview - Mobile optimized */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-center bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-2 sm:py-2 rounded-lg text-center sm:text-left">
                <div className="bg-gold-500 p-1.5 rounded-lg mb-1 sm:mb-0 sm:mr-3">
                  <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-lg font-bold text-white">{dashboardStats?.activeAgents || 0}</div>
                  <div className="text-xs text-olive-200 hidden sm:block">AI agents active</div>
                  <div className="text-xs text-olive-200 sm:hidden">agents</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-2 sm:py-2 rounded-lg text-center sm:text-left">
                <div className="bg-olive-500 p-1.5 rounded-lg mb-1 sm:mb-0 sm:mr-3">
                  <ChartBarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-lg font-bold text-white">{dashboardStats?.totalConversations || 0}</div>
                  <div className="text-xs text-olive-200 hidden sm:block">conversations today</div>
                  <div className="text-xs text-olive-200 sm:hidden">today</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-2 sm:py-2 rounded-lg text-center sm:text-left">
                <div className={`p-1.5 rounded-lg mb-1 sm:mb-0 sm:mr-3 relative ${
                  systemHealth?.status === 'healthy' ? 'bg-green-500' :
                  systemHealth?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse ${
                    systemHealth?.status === 'healthy' ? 'bg-green-400' :
                    systemHealth?.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                </div>
                <div className="min-w-0">
                  <div className={`text-sm sm:text-lg font-bold ${
                    systemHealth?.status === 'healthy' ? 'text-green-200' :
                    systemHealth?.status === 'degraded' ? 'text-yellow-200' : 'text-red-200'
                  }`}>System</div>
                  <div className={`text-xs ${
                    systemHealth?.status === 'healthy' ? 'text-green-300' :
                    systemHealth?.status === 'degraded' ? 'text-yellow-300' : 'text-red-300'
                  }`}>
                    {systemHealth?.status || 'healthy'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons - Mobile optimized */}
          <div className="flex items-center justify-between lg:justify-end space-x-2 sm:space-x-3">
            {/* Mobile: Show last login info */}
            <div className="sm:hidden flex items-center text-olive-200 text-xs">
              <ClockIcon className="h-3 w-3 mr-1" />
              <span className="truncate">{getLastLoginTime()}</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button 
                className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="View notifications"
              >
                <BellIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button 
                className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Open settings"
              >
                <Cog6ToothIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={onRefresh}
                className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/50 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                aria-label="Refresh dashboard data"
              >
                <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="h-2 sm:h-4 bg-gradient-to-b from-gold-600/20 to-transparent"></div>
    </div>
  )
})

export default DashboardHeader