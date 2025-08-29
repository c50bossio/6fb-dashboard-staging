'use client'

// Updated to remove SparklesIcon dependencies
import { 
  ChartBarIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  PresentationChartLineIcon,
  XCircleIcon,
  PlayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { 
  ChartBarIcon as ChartBarSolid,
  CpuChipIcon as CpuChipSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  PresentationChartLineIcon as PresentationChartSolid
} from '@heroicons/react/24/solid'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'

// React Query hooks replacing GlobalDashboardContext
import { useBusinessContext, useCurrentShopId } from '../../hooks/useBusinessContext'
import { useShopData, useShopDashboard } from '../../hooks/useShopData'
import { useAppointments, useTodayAppointments } from '../../hooks/useAppointments'
import { useStaff, useActiveStaff } from '../../hooks/useStaffQuery'
import { createBarbershopForOwner } from '@/lib/barbershop-helper'
import { useDashboardPerspective } from '../../contexts/DashboardPerspectiveContext'
import ActionCenter from './ActionCenter'
import AICoachPanel from './AICoachPanel'
import AnalyticsPanel from './AnalyticsPanel'
import CampaignCreditWidget from './CampaignCreditWidget'
import ExecutiveLoadingState from './ExecutiveLoadingState'
import OnboardingProgress from './OnboardingProgress'
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel'
import QuickActionsCard from './QuickActionsCard'
import ShareableBookingLink from './ShareableBookingLink'
import SmartAlertsPanel from './SmartAlertsPanel'
import UnifiedExecutiveSummary from './UnifiedExecutiveSummary'
// DataImportWidget removed - replaced with QuickActionsCard for better UX

const DASHBOARD_MODES = {
  EXECUTIVE: 'executive',
  AI_INSIGHTS: 'ai_insights', 
  ANALYTICS: 'analytics',
  PREDICTIVE: 'predictive',
  OPERATIONS: 'operations'
}

// Color mapping for Tailwind CSS classes (must be complete class names)
const colorClasses = {
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500'
}

const modeConfigs = {
  [DASHBOARD_MODES.EXECUTIVE]: {
    label: 'Executive Overview',
    icon: Squares2X2Icon,
    solidIcon: Squares2X2Icon,
    color: 'indigo',
    description: 'High-level business performance'
  },
  [DASHBOARD_MODES.AI_INSIGHTS]: {
    label: 'AI Insights',
    icon: CpuChipIcon,
    solidIcon: CpuChipSolid,
    color: 'purple',
    description: 'AI-powered recommendations'
  },
  [DASHBOARD_MODES.ANALYTICS]: {
    label: 'Analytics',
    icon: ChartBarIcon,
    solidIcon: ChartBarSolid,
    color: 'blue',
    description: 'Detailed performance metrics'
  },
  [DASHBOARD_MODES.PREDICTIVE]: {
    label: 'Predictive',
    icon: PresentationChartLineIcon,
    solidIcon: PresentationChartSolid,
    color: 'purple',
    description: 'AI-powered forecasting & predictions'
  },
  [DASHBOARD_MODES.OPERATIONS]: {
    label: 'Operations',
    icon: ClipboardDocumentListIcon,
    solidIcon: ClipboardSolid,
    color: 'green',
    description: 'Day-to-day management'
  }
}

export default function UnifiedDashboard({ user, profile }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modeParam = searchParams.get('mode')
  
  // React Query hooks replacing GlobalDashboardContext
  const { businessContext, user: contextUser, profile: contextProfile, shopId, isLoading: contextLoading } = useBusinessContext()
  const currentShopId = useCurrentShopId()
  
  // Use the automatically detected shop ID or fallback to props
  const effectiveShopId = currentShopId || profile?.shop_id || profile?.barbershop_id
  const effectiveUser = contextUser || user
  const effectiveProfile = contextProfile || profile
  
  // Dashboard data hooks
  const { 
    shop, 
    metrics, 
    appointments,
    staff,
    analytics,
    isLoading: shopDataLoading,
    error: shopDataError,
    refetch: refetchShopData
  } = useShopDashboard(effectiveShopId)
  
  // Additional data hooks for specific needs
  const { data: todayAppointments } = useTodayAppointments(effectiveShopId)
  const { data: activeStaff } = useActiveStaff(effectiveShopId)
  
  // Keep DashboardPerspectiveContext as it manages UI state
  const { selectedPerspective, isOwnerView, currentViewUserId } = useDashboardPerspective()
  
  const [currentMode, setCurrentMode] = useState(DASHBOARD_MODES.EXECUTIVE)
  const [errorState, setErrorState] = useState(null)
  const [aiAgents, setAiAgents] = useState({ total: 0, active: 0 })
  
  // Derived state for multi-location and permissions (simplified)
  const isMultiLocation = false // Simplified for now - can be enhanced later
  const permissions = businessContext?.permissions || []
  const availableLocations = shop ? [shop] : []
  const selectedLocations = effectiveShopId ? [effectiveShopId] : []
  const selectedBarbers = [] // Simplified for now
  const viewMode = 'individual' // Simplified for now

  // Function to launch onboarding flow
  const launchOnboarding = useCallback(() => {
    window.dispatchEvent(new CustomEvent('launchOnboarding', {
      detail: { forced: true, source: 'dashboard_setup_card' }
    }))
  }, [])

  // Handle onboarding and barbershop creation with React Query
  const handleBarbershopCreation = useCallback(async () => {
    if (!effectiveShopId && effectiveProfile?.role === 'SHOP_OWNER') {
      try {
        const newBarbershop = await createBarbershopForOwner(effectiveUser, {
          name: effectiveProfile.shop_name || effectiveProfile.business_name
        })
        
        // Refetch business context to get the new shop ID
        if (newBarbershop?.id) {
          // The refetch will be handled by React Query automatically
          window.location.reload() // Temporary solution for immediate update
        }
      } catch (error) {
        console.error('Failed to create barbershop:', error)
        setErrorState({
          type: 'technical_error',
          message: 'Failed to create barbershop. Please try again.',
          isWelcome: false
        })
      }
    }
  }, [effectiveShopId, effectiveProfile, effectiveUser])

  // Loading state combines context and shop data loading
  const isLoading = contextLoading || shopDataLoading

  // Compute dashboard data from React Query results
  const dashboardData = useMemo(() => {
    if (!metrics || !shop) return null

    return {
      metrics: {
        revenue: metrics.total_revenue || 0,
        customers: metrics.total_customers || 0,
        appointments: metrics.total_appointments || 0,
        satisfaction: metrics.avg_satisfaction || 0
      },
      todayMetrics: {
        revenue: metrics.daily_revenue || 0,
        bookings: todayAppointments?.length || 0,
        capacity: Math.round(metrics.occupancy_rate || 0),
        nextAppointment: todayAppointments?.length > 0 ? 'Check calendar' : 'No appointments'
      },
      trends: {
        revenue_trend: metrics.revenue_growth || 0,
        customers_trend: null,
        appointments_trend: null,
        satisfaction_trend: null,
        has_sufficient_data: true
      },
      business_insights: {
        active_barbershops: 1,
        total_ai_recommendations: 0,
        user_satisfaction_score: 4.5,
        revenue_growth: metrics.revenue_growth || 0,
        appointment_completion_rate: metrics.appointment_completion_rate || 0
      },
      user_engagement: {
        active_users: metrics.total_customers || 0,
        total_users: metrics.total_customers || 0,
        new_users: metrics.new_customers_this_month || 0,
        retention_rate: Math.round(metrics.customer_retention_rate || 0)
      },
      system_health: {
        status: 'healthy',
        database: { healthy: true },
        data_source: 'react_query',
        last_updated: new Date().toISOString()
      },
      performance: {
        avg_response_time_ms: 150,
        api_success_rate: 99.5,
        uptime_percent: 99.8
      },
      analytics_data: metrics,
      popular_services: [],
      peak_hours: []
    }
  }, [metrics, shop, todayAppointments])

  // Handle refresh with React Query
  const handleRefresh = useCallback(() => {
    refetchShopData()
  }, [refetchShopData])

  // Last refresh time
  const lastRefresh = useMemo(() => new Date(), [dashboardData])

  // Handle mode changes and persistence
  useEffect(() => {
    if (modeParam && Object.values(DASHBOARD_MODES).includes(modeParam)) {
      setCurrentMode(modeParam)
    } else if (!modeParam) {
      const savedMode = localStorage.getItem('preferredDashboardMode')
      if (savedMode && Object.values(DASHBOARD_MODES).includes(savedMode)) {
        setCurrentMode(savedMode)
        const currentPath = window.location.pathname
        if (currentPath === '/dashboard') {
          router.replace(`/dashboard?mode=${savedMode}`, undefined, { shallow: true })
        }
      } else {
        setCurrentMode(DASHBOARD_MODES.EXECUTIVE)
        const currentPath = window.location.pathname
        if (currentPath === '/dashboard') {
          router.replace(`/dashboard?mode=${DASHBOARD_MODES.EXECUTIVE}`, undefined, { shallow: true })
        }
      }
    }
  }, [modeParam, router])

  // Handle errors and onboarding
  useEffect(() => {
    if (shopDataError) {
      setErrorState({
        type: 'technical_error',
        message: 'Failed to load barbershop data. Please try again.',
        isWelcome: false
      })
    } else if (!effectiveShopId && effectiveProfile?.role === 'SHOP_OWNER' && !contextLoading) {
      setErrorState({
        type: 'onboarding_needed',
        message: 'Let\'s set up your barbershop to get started!',
        isWelcome: true,
        title: 'Welcome to 6FB!',
        timeEstimate: '2-3 minutes',
        nextSteps: [
          'Create your barbershop profile',
          'Set up your services and pricing',
          'Configure your booking availability'
        ]
      })
    } else if (effectiveShopId) {
      setErrorState(null)
    }
  }, [shopDataError, effectiveShopId, effectiveProfile?.role, contextLoading])

  // Auto-refresh for operations mode
  useEffect(() => {
    if (currentMode === DASHBOARD_MODES.OPERATIONS) {
      const interval = setInterval(() => {
        refetchShopData()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [currentMode, refetchShopData])

  const handleModeChange = (mode) => {
    setCurrentMode(mode)
    localStorage.setItem('preferredDashboardMode', mode)
    router.push(`/dashboard?mode=${mode}`)
  }

  const handleExecutiveModeHover = useCallback(() => {
    // Prefetch executive data when hovering (React Query handles this automatically)
    if (currentMode !== DASHBOARD_MODES.EXECUTIVE && effectiveShopId) {
      // React Query will handle prefetching via staleTime configuration
    }
  }, [currentMode, effectiveShopId])

  const ModeSelector = () => (
    <div className="bg-white dark:bg-charcoal-700 rounded-xl shadow-sm border border-gray-200 dark:border-charcoal-600 p-2 flex flex-wrap gap-2">
      {Object.entries(DASHBOARD_MODES).map(([key, value]) => {
        const config = modeConfigs[value]
        const Icon = currentMode === value ? config.solidIcon : config.icon
        const isActive = currentMode === value
        
        return (
          <button
            key={key}
            onClick={() => handleModeChange(value)}
            onMouseEnter={value === DASHBOARD_MODES.EXECUTIVE ? handleExecutiveModeHover : undefined}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200 
              ${isActive 
                ? `${colorClasses[config.color]} text-white shadow-lg scale-105` 
                : `bg-gray-50 dark:bg-charcoal-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-charcoal-500`
              }
            `}
          >
            <Icon className="h-5 w-5" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        )
      })}
      
      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-charcoal-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-charcoal-500 transition-colors"
      >
        <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        <span className="text-xs hidden lg:inline">
          {isLoading ? 'Refreshing...' : `Last: ${lastRefresh.toLocaleTimeString()}`}
        </span>
      </button>
    </div>
  )

  const renderModeContent = () => {
    if (isLoading && !dashboardData) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      )
    }

    switch (currentMode) {
      case DASHBOARD_MODES.EXECUTIVE:
        // Handle different view modes for multi-location users
        if (isMultiLocation && selectedLocations.length > 1) {
          if (viewMode === 'consolidated') {
            // Consolidated view - aggregate all data
            return (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Consolidated View - {selectedLocations.length} Locations
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Viewing aggregated data across all selected locations
                      </p>
                    </div>
                  </div>
                </div>
                <UnifiedExecutiveSummary data={dashboardData} mode="consolidated" />
                <SmartAlertsPanel data={dashboardData} />
              </div>
            )
          } else if (viewMode === 'individual') {
            // Individual view - show each location separately
            return (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                        Individual View - {selectedLocations.length} Locations
                      </h3>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Viewing each location separately
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {selectedLocations.map(locationId => {
                    const location = availableLocations.find(l => l.id === locationId)
                    return (
                      <div key={locationId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                          {location?.name || 'Location'}
                        </h4>
                        <UnifiedExecutiveSummary data={dashboardData} mode="individual" locationId={locationId} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          } else if (viewMode === 'comparison') {
            // Comparison view - side-by-side metrics
            return (
              <div className="space-y-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        Comparison View - {selectedLocations.length} Locations
                      </h3>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        Comparing performance metrics side-by-side
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Today's Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Appointments
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Active Barbers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Occupancy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedLocations.map(locationId => {
                        const location = availableLocations.find(l => l.id === locationId)
                        return (
                          <tr key={locationId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {location?.name || 'Location'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              ${dashboardData?.metrics?.daily_revenue || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {dashboardData?.metrics?.appointments_today || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {dashboardData?.metrics?.active_barbers || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {dashboardData?.metrics?.occupancy_rate || 0}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        }
        // Default single location view
        return null
        
      case DASHBOARD_MODES.AI_INSIGHTS:
        return (
          <div className="space-y-6">
            {/* AI Business Insights Header */}
            <div className="bg-olive-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">AI Business Insights</h3>
                  <p className="text-olive-100">Intelligent recommendations to grow your business</p>
                </div>
                <div className="flex items-center gap-6">
                  {aiAgents.total > 0 ? (
                    <>
                      <div className="text-center">
                        <div className="text-3xl font-bold">{aiAgents.total}</div>
                        <div className="text-sm text-olive-100">AI Coaches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">{aiAgents.active}</div>
                        <div className="text-sm text-olive-100">Working for You</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-olive-100">
                      AI agents initializing...
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <AICoachPanel data={dashboardData} />
          </div>
        )
        
      case DASHBOARD_MODES.ANALYTICS:
        return <AnalyticsPanel data={dashboardData} />
        
      case DASHBOARD_MODES.PREDICTIVE:
        return <PredictiveAnalyticsPanel data={dashboardData} />
        
      case DASHBOARD_MODES.OPERATIONS:
        return <ActionCenter data={{
          ...dashboardData,
          barbershop_id: effectiveShopId
        }} />
        
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Progress - PRIORITY: Always show until ALL steps complete, not just profile flag */}
      {profile && (
        <OnboardingProgress user={user} profile={profile} />
      )}
      
      {/* Header with Mode Selector and Performance Indicator */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Main Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{modeConfigs[currentMode].description}</p>
          </div>
          <ModeSelector />
        </div>
        
        {/* Shareable Booking Link - Only show for shop owners and above, after onboarding */}
        {(profile?.role === 'SHOP_OWNER' || profile?.role === 'ENTERPRISE_OWNER' || profile?.role === 'SUPER_ADMIN') && 
         profile?.onboarding_completed && (
          <ShareableBookingLink />
        )}
      </div>
      
      {/* View Perspective Indicator */}
      {(() => {
        // // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
return !isOwnerView && selectedPerspective && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Viewing as: {selectedPerspective.name}
              </span>
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                ({selectedPerspective.role})
              </span>
            </div>
          </div>
        )
      })()}

      {/* Welcome Setup Prompt or Error State Display */}
      {errorState && (
        <div className={`
          rounded-xl mb-6 border overflow-hidden
          ${errorState.isWelcome 
            ? 'bg-gradient-to-br from-brand-50 via-purple-50 to-indigo-50 dark:from-brand-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 border-brand-200 dark:border-brand-700 shadow-lg' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }
        `}>
          {errorState.isWelcome ? (
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Squares2X2Icon className="h-7 w-7 text-brand-600 animate-pulse" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-brand-800 dark:text-brand-200">
                        {errorState.title || 'Almost There!'}
                      </h3>
                      {errorState.timeEstimate && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-800/30 dark:text-brand-200">
                          {errorState.timeEstimate}
                        </span>
                      )}
                    </div>
                    <p className="text-brand-700 dark:text-brand-300 mb-4 leading-relaxed">
                      {typeof errorState === 'string' ? errorState : errorState.message}
                    </p>
                    
                    {errorState.nextSteps && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-brand-800 dark:text-brand-200 mb-2">
                          What's next:
                        </h4>
                        <ul className="space-y-1">
                          {errorState.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-center text-sm text-brand-700 dark:text-brand-300">
                              <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-800/30 flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                                  {index + 1}
                                </span>
                              </div>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={launchOnboarding}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 shadow-sm"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Complete Setup
                      </button>
                      
                      {effectiveProfile?.role === 'SHOP_OWNER' && (
                        <button
                          onClick={handleBarbershopCreation}
                          className="inline-flex items-center px-4 py-2 border border-brand-300 text-sm font-medium rounded-lg text-brand-700 bg-transparent hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200"
                        >
                          Quick Setup
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
                    Dashboard Error
                  </h3>
                  <p className="text-sm mb-4 text-red-700 dark:text-red-300">
                    {typeof errorState === 'string' ? errorState : errorState.message}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {shopDataError && (
                      <button
                        onClick={handleRefresh}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Retry Dashboard Load
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Executive Mode Content */}
      {currentMode === DASHBOARD_MODES.EXECUTIVE && (
        <>
          {isLoading && !dashboardData ? (
            <ExecutiveLoadingState />
          ) : dashboardData ? (
            <>
              <UnifiedExecutiveSummary data={dashboardData} />
              
              {/* Quick Actions Card - Always visible for easy access to common tasks */}
              <QuickActionsCard profile={profile} />
              
              {/* Campaign Credit Widget - Shows earned credits from payment processing */}
              {effectiveShopId && (
                <CampaignCreditWidget 
                  barbershopId={effectiveShopId}
                />
              )}
              
              {effectiveShopId && (
                <SmartAlertsPanel barbershop_id={effectiveShopId} />
              )}
            </>
          ) : null}
        </>
      )}

      {/* Mode-specific content - Render other modes */}
      {currentMode !== DASHBOARD_MODES.EXECUTIVE && renderModeContent()}
    </div>
  )
}

