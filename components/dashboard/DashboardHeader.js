'use client'

import { Badge } from '../ui'
import Button from '../Button'
import { 
  ArrowPathIcon, 
  BellIcon, 
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function DashboardHeader({ 
  user, 
  profile, 
  onRefresh, 
  systemHealth,
  dashboardStats 
}) {
  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours()
    
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getLastLoginTime = () => {
    // Mock implementation - in real app, this would come from user data
    const lastLogin = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    return lastLogin.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Main header content */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 min-w-0">
            {/* Greeting and user info */}
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight">
                {getCurrentTimeGreeting()}, {profile?.full_name || user?.user_metadata?.full_name || 'User'}! 👋
              </h1>
              <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
                {profile?.shop_name ? `Managing ${profile.shop_name}` : 'Your AI-powered barbershop is running smoothly'}
              </p>
            </div>

            {/* User context and badges - Mobile optimized */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
              <Badge variant="solid-secondary" size="default" className="sm:px-3 sm:py-1 sm:text-sm">
                {profile?.role?.replace('_', ' ').toUpperCase() || 'USER'}
              </Badge>
              <Badge 
                variant={profile?.subscription_status === 'premium' ? 'solid-warning' : 'outline-default'} 
                size="default"
                className="sm:px-3 sm:py-1 sm:text-sm"
              >
                {profile?.subscription_status?.toUpperCase() || 'FREE PLAN'}
              </Badge>
              
              <div className="hidden sm:flex items-center text-blue-200 text-sm">
                <ClockIcon className="h-4 w-4 mr-1" />
                Last login: {getLastLoginTime()}
              </div>
            </div>

            {/* Quick stats preview - Responsive layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 text-sm">
              <div className="flex items-center text-blue-200">
                <SparklesIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{dashboardStats?.activeAgents || 1} AI agents active</span>
              </div>
              <div className="flex items-center text-blue-200">
                <ChartBarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{dashboardStats?.totalConversations || 0} conversations today</span>
              </div>
              <div className="flex items-center text-green-200">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse flex-shrink-0"></div>
                <span className="truncate">System {systemHealth?.status || 'healthy'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons - Mobile optimized */}
          <div className="flex items-center justify-between lg:justify-end space-x-2 sm:space-x-3">
            {/* Mobile: Show last login info */}
            <div className="sm:hidden flex items-center text-blue-200 text-xs">
              <ClockIcon className="h-3 w-3 mr-1" />
              <span className="truncate">{getLastLoginTime()}</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button 
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="View notifications"
              >
                <BellIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button 
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Open settings"
              >
                <Cog6ToothIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 text-xs sm:text-sm px-2 sm:px-4"
                ariaLabel="Refresh dashboard data"
              >
                <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="h-2 sm:h-4 bg-gradient-to-b from-purple-600/20 to-transparent"></div>
    </div>
  )
}