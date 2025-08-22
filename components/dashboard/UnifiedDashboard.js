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
} from '@heroicons/react/24/outline'
import { 
  ChartBarIcon as ChartBarSolid,
  CpuChipIcon as CpuChipSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  PresentationChartLineIcon as PresentationChartSolid
} from '@heroicons/react/24/solid'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'

import { getUserBarbershopId, createBarbershopForOwner } from '@/lib/barbershop-helper'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import ActionCenter from './ActionCenter'
import AICoachPanel from './AICoachPanel'
import AnalyticsPanel from './AnalyticsPanel'
import ExecutiveLoadingState from './ExecutiveLoadingState'
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel'
import SmartAlertsPanel from './SmartAlertsPanel'
import UnifiedExecutiveSummary from './UnifiedExecutiveSummary'
import ShareableBookingLink from './ShareableBookingLink'


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
  const { selectedLocations, selectedBarbers, isMultiLocation, permissions, viewMode, availableLocations } = useGlobalDashboard()
  
  const [currentMode, setCurrentMode] = useState(DASHBOARD_MODES.EXECUTIVE)
  const [isLoading, setIsLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [aiAgents, setAiAgents] = useState({ total: 0, active: 0 })
  const [notifications, setNotifications] = useState([])
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [cachedData, setCachedData] = useState(null)
  const [cacheTimestamp, setCacheTimestamp] = useState(null)
  const [errorState, setErrorState] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [currentBarbershopId, setCurrentBarbershopId] = useState(null)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const loadingRef = useRef(false)

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    // Declare barbershopId at function scope to prevent ReferenceError
    let barbershopId = null
    
    // Check if onboarding is incomplete
    const isOnboardingIncomplete = profile?.onboarding_completed === false || !profile?.onboarding_completed
    
    if (isOnboardingIncomplete && !errorState?.isWelcome) {
        // Show welcome message instead of blocking
        const roleSpecificMessage = profile?.role === 'BARBER' 
          ? {
              title: 'Connect to Your Barbershop',
              message: 'Your barber profile is ready! To access your dashboard, you need to be connected to a barbershop. Either complete your setup or ask your shop owner to add you to their team.',
              timeEstimate: '2-3 minutes',
              nextSteps: ['Verify barbershop association', 'Set your working hours', 'Add your specialties'],
              buttonText: 'Connect to Barbershop'
            }
          : profile?.role === 'SHOP_OWNER'
          ? {
              title: 'Finish Your Barbershop Setup',
              message: 'You\'re almost ready to start managing your barbershop! Just a few more steps to unlock your full business dashboard.',
              timeEstimate: '3-5 minutes',
              nextSteps: ['Add barbershop details', 'Set operating hours', 'Configure services & pricing'],
              buttonText: 'Complete Barbershop Setup'
            }
          : {
              title: 'Complete Your Account Setup',
              message: 'Welcome to 6FB AI! Let\'s finish setting up your account to unlock all dashboard features and start managing your business.',
              timeEstimate: '2-4 minutes', 
              nextSteps: ['Choose your role', 'Add business information', 'Configure preferences'],
              buttonText: 'Continue Setup'
            }
        
        setErrorState({
          type: 'onboarding_needed',
          message: roleSpecificMessage.message,
          title: roleSpecificMessage.title,
          timeEstimate: roleSpecificMessage.timeEstimate,
          nextSteps: roleSpecificMessage.nextSteps,
          buttonText: roleSpecificMessage.buttonText,
          isWelcome: true
        })
      return
    }

    // Rate limiting: prevent excessive retries
    if (retryCount >= 3 && !forceRefresh) {
      console.warn('Max retry attempts reached - stopping dashboard data load')
      
      // Check if this is an onboarding issue vs technical issue before setting error
      const isOnboardingIncomplete = profile?.onboarding_completed === false || !profile?.onboarding_completed
      
      if (isOnboardingIncomplete) {
        // This is still an onboarding issue, show welcome message
        const roleSpecificMessage = profile?.role === 'BARBER' 
          ? {
              title: 'Connect to Your Barbershop',
              message: 'Your barber profile is ready! To access your dashboard, you need to be connected to a barbershop. Either complete your setup or ask your shop owner to add you to their team.',
              timeEstimate: '2-3 minutes',
              nextSteps: ['Verify barbershop association', 'Set your working hours', 'Add your specialties'],
              buttonText: 'Connect to Barbershop'
            }
          : profile?.role === 'SHOP_OWNER'
          ? {
              title: 'Finish Your Barbershop Setup',
              message: 'You\'re almost ready to start managing your barbershop! Just a few more steps to unlock your full business dashboard.',
              timeEstimate: '3-5 minutes',
              nextSteps: ['Add barbershop details', 'Set operating hours', 'Configure services & pricing'],
              buttonText: 'Complete Barbershop Setup'
            }
          : {
              title: 'Complete Your Account Setup',
              message: 'Welcome to 6FB AI! Let\'s finish setting up your account to unlock all dashboard features and start managing your business.',
              timeEstimate: '2-4 minutes', 
              nextSteps: ['Choose your role', 'Add business information', 'Configure preferences'],
              buttonText: 'Continue Setup'
            }
        
        setErrorState({
          type: 'onboarding_needed',
          message: roleSpecificMessage.message,
          title: roleSpecificMessage.title,
          timeEstimate: roleSpecificMessage.timeEstimate,
          nextSteps: roleSpecificMessage.nextSteps,
          buttonText: roleSpecificMessage.buttonText,
          isWelcome: true
        })
      } else {
        // This is a technical error after onboarding should be complete
        setErrorState({
          type: 'technical_error',
          message: 'Max retry attempts reached. Please refresh the page.',
          isWelcome: false
        })
      }
      return
    }

    try {
      // Clear any previous error state on successful retry
      if (forceRefresh) {
        setErrorState(null)
        setRetryCount(0)
      }

      // Guard: Wait for both user and profile to be available
      if (!user || !profile) {
        console.log('Waiting for user and profile data to load...')
        setIsLoading(false)
        return
      }

      // Get barbershop_id(s) based on global context selection or user profile
      if (selectedLocations.length > 0) {
        // Use selected locations from global context
        barbershopId = selectedLocations
      } else {
        // Fall back to user's default barbershop
        barbershopId = await getUserBarbershopId(user, profile)
      }
      
      // For shop owners without a barbershop, create one automatically
      if (!barbershopId && profile?.role === 'SHOP_OWNER') {
        try {
          console.log('Creating barbershop for shop owner...')
          const newBarbershop = await createBarbershopForOwner(user, {
            name: profile.shop_name || profile.business_name
          })
          barbershopId = newBarbershop.id
          console.log('Successfully created barbershop:', barbershopId)
        } catch (error) {
          console.error('Failed to create barbershop:', error)
          setRetryCount(prev => prev + 1)
        }
      }
      
      if (!barbershopId) {
        // Check if this is an onboarding issue vs technical issue
        const isOnboardingIncomplete = profile?.onboarding_completed === false || !profile?.onboarding_completed
        
        // Only log as error if it's a technical issue, not onboarding
        if (!isOnboardingIncomplete) {
          console.error('No barbershop ID found for user who completed onboarding')
        } else {
          console.info('User needs to complete onboarding to get barbershop ID')
        }
        
        if (isOnboardingIncomplete) {
          // This is a friendly onboarding prompt, not an error
          const roleSpecificMessage = profile?.role === 'BARBER' 
            ? {
                title: 'Connect to Your Barbershop',
                message: 'Your barber profile is ready! To access your dashboard, you need to be connected to a barbershop. Either complete your setup or ask your shop owner to add you to their team.',
                timeEstimate: '2-3 minutes',
                nextSteps: ['Verify barbershop association', 'Set your working hours', 'Add your specialties'],
                buttonText: 'Connect to Barbershop'
              }
            : profile?.role === 'SHOP_OWNER'
            ? {
                title: 'Finish Your Barbershop Setup',
                message: 'You\'re almost ready to start managing your barbershop! Just a few more steps to unlock your full business dashboard.',
                timeEstimate: '3-5 minutes',
                nextSteps: ['Add barbershop details', 'Set operating hours', 'Configure services & pricing'],
                buttonText: 'Complete Barbershop Setup'
              }
            : {
                title: 'Complete Your Account Setup',
                message: 'Welcome to 6FB AI! Let\'s finish setting up your account to unlock all dashboard features and start managing your business.',
                timeEstimate: '2-4 minutes', 
                nextSteps: ['Choose your role', 'Add business information', 'Configure preferences'],
                buttonText: 'Continue Setup'
              }
          
          setErrorState({
            type: 'onboarding_needed',
            message: roleSpecificMessage.message,
            title: roleSpecificMessage.title,
            timeEstimate: roleSpecificMessage.timeEstimate,
            nextSteps: roleSpecificMessage.nextSteps,
            buttonText: roleSpecificMessage.buttonText,
            isWelcome: true
          })
        } else {
          // This is a technical error after onboarding should be complete
          const errorMessage = profile?.role === 'BARBER' 
            ? 'Your barber account is not properly associated with a barbershop. Please contact your shop owner or support for assistance.'
            : 'Technical issue: Unable to load your barbershop data. Please contact support if this problem persists.'
          
          setErrorState({
            type: 'technical_error',
            message: errorMessage,
            isWelcome: false
          })
        }
        
        setDashboardData({
          error: 'barbershop_id_missing',
          system_health: { status: 'setup_needed', database: { healthy: true } }
        })
        setIsLoading(false)
        setRetryCount(prev => prev + 1)
        
        // Only open circuit breaker for technical errors, not onboarding issues
        if (retryCount >= 2 && !isOnboardingIncomplete) {
        }
        return
      }

      // Reset error state on successful barbershop ID retrieval
      setErrorState(null)
      setRetryCount(0)
      
      // Store barbershopId in component state for other functions to use
      setCurrentBarbershopId(barbershopId)
    } catch (error) {
      console.error('Error in barbershop ID retrieval:', error)
      setRetryCount(prev => prev + 1)
      setErrorState({
        type: 'technical_error',
        message: 'Failed to load barbershop information. Please try again.',
        isWelcome: false
      })
      setIsLoading(false)
      return
    }
    
    // Guard: Ensure barbershopId is valid before making API calls
    if (!barbershopId) {
      console.error('Cannot load dashboard data: barbershopId is null or undefined')
      setErrorState({
        type: 'technical_error',
        message: 'Unable to identify your barbershop. Please contact support if this problem persists.',
        isWelcome: false
      })
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      if (currentMode === DASHBOARD_MODES.EXECUTIVE) {
        // Use enhanced analytics endpoint with support for multiple locations
        const barbershopIds = Array.isArray(barbershopId) ? barbershopId : [barbershopId]
        const barberFilter = selectedBarbers.length > 0 ? `&barber_ids=${selectedBarbers.join(',')}` : ''
        const response = await fetch(`/api/analytics/live-data?barbershop_ids=${barbershopIds.join(',')}&format=json&force_refresh=${forceRefresh}${barberFilter}`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          const apiData = result.data
          
          // Transform real Supabase data for dashboard display
          const transformedData = {
            metrics: {
              revenue: apiData.total_revenue || 0,
              customers: apiData.total_customers || 0,
              appointments: apiData.total_appointments || 0,
              satisfaction: apiData.satisfaction || apiData.avg_satisfaction || 0 // Use real data
            },
            todayMetrics: {
              revenue: apiData.daily_revenue || 0,
              bookings: apiData.appointments_today || 0,
              capacity: Math.round(apiData.occupancy_rate || 0),
              nextAppointment: apiData.appointments_today > 0 ? 'Check calendar' : 'No appointments'
            },
            // Pass through the real trends data from API
            trends: apiData.trends || {
              revenue_trend: null,
              customers_trend: null,
              appointments_trend: null,
              satisfaction_trend: null,
              has_sufficient_data: false
            },
            business_insights: {
              active_barbershops: 1,
              total_ai_recommendations: apiData.most_popular_services?.length || 0,
              user_satisfaction_score: 4.5,
              revenue_growth: apiData.revenue_growth || 0,
              appointment_completion_rate: apiData.appointment_completion_rate || 0
            },
            user_engagement: {
              active_users: apiData.total_customers || 0,
              total_users: apiData.total_customers || 0,
              new_users: apiData.new_customers_this_month || 0,
              retention_rate: Math.round(apiData.customer_retention_rate || 0)
            },
            system_health: {
              status: result.data_source === 'supabase_enhanced' ? 'healthy' : 'degraded',
              database: { healthy: result.data_source !== 'error' },
              data_source: result.data_source,
              last_updated: apiData.last_updated
            },
            performance: {
              avg_response_time_ms: result.meta?.performance?.queryTime || 150,
              api_success_rate: result.data_source === 'error' ? 0 : 99.5,
              uptime_percent: 99.8
            },
            analytics_data: apiData,
            popular_services: apiData.most_popular_services || [],
            peak_hours: apiData.peak_booking_hours || []
          }
          
          setDashboardData(transformedData)
          console.log('📊 Dashboard loaded with real data:', {
            revenue: apiData.total_revenue,
            appointments: apiData.total_appointments,
            customers: apiData.total_customers,
            source: result.data_source || 'api',
            mode: currentMode,
            timestamp: new Date().toISOString()
          })
        } else {
          console.warn('Analytics API error:', result)
          // Set error state instead of empty data
          setDashboardData({
            metrics: { revenue: 0, customers: 0, appointments: 0, satisfaction: 0 },
            system_health: { status: 'error', database: { healthy: false } },
            error: result.error || 'Failed to load analytics data'
          })
        }
      } else {
        // For other modes, use dashboard metrics API
        // Double-check barbershopId is still valid (defensive programming)
        if (!barbershopId) {
          throw new Error('barbershopId became null during execution')
        }
        const response = await fetch(`/api/dashboard/metrics?mode=${currentMode}&barbershop_id=${barbershopId}`)
        const processedData = await response.json()
        
        if (!response.ok) {
          console.warn('Dashboard API error:', processedData)
          setDashboardData({ error: 'Failed to load dashboard data' })
          return
        }
        
        // Handle AI insights mode
        if (currentMode === DASHBOARD_MODES.AI_INSIGHTS) {
          const aiData = processedData.ai_activity || {}
          // Use real counts from database, no defaults
          setAiAgents({
            total: aiData.total_agents || 0,
            active: aiData.active_agents || 0
          })
        }

        setDashboardData(processedData)
      }
      
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setErrorState({
        type: 'technical_error',
        message: 'Network error: Unable to load dashboard data. Please check your connection and try again.',
        isWelcome: false
      })
      setDashboardData({
        error: 'Network error: Unable to load dashboard data',
        system_health: { status: 'error', database: { healthy: false } }
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentMode, user, profile, retryCount])


  useEffect(() => {
    if (modeParam && Object.values(DASHBOARD_MODES).includes(modeParam)) {
      setCurrentMode(modeParam)
    } else if (!modeParam) {
      const savedMode = localStorage.getItem('preferredDashboardMode')
      if (savedMode && Object.values(DASHBOARD_MODES).includes(savedMode)) {
        setCurrentMode(savedMode)
        // Only update URL if we're on the dashboard page itself
        // Don't redirect if we're on a sub-route like /dashboard/calendar
        const currentPath = window.location.pathname
        if (currentPath === '/dashboard') {
          // Use replace with shallow routing to avoid navigation
          router.replace(`/dashboard?mode=${savedMode}`, undefined, { shallow: true })
        }
      } else {
        setCurrentMode(DASHBOARD_MODES.EXECUTIVE)
        // Only update URL if we're on the dashboard page itself
        const currentPath = window.location.pathname
        if (currentPath === '/dashboard') {
          router.replace(`/dashboard?mode=${DASHBOARD_MODES.EXECUTIVE}`, undefined, { shallow: true })
        }
      }
    }
  }, [modeParam, router])


  useEffect(() => {
    // Prevent duplicate initial loads
    if (!user || !profile || loadingRef.current) {
      return
    }
    
    // Only load dashboard data if we haven't done the initial load
    // or if the mode changes after initial load
    if (!hasInitialLoad || currentMode !== DASHBOARD_MODES.EXECUTIVE) {
      console.log(`🔄 Loading dashboard data for mode: ${currentMode}`)
      loadingRef.current = true
      loadDashboardData().finally(() => {
        loadingRef.current = false
      })
      setHasInitialLoad(true)
    }
    
    if (currentMode === DASHBOARD_MODES.OPERATIONS) {
      const interval = setInterval(() => {
        if (!loadingRef.current) {
          console.log('🔄 Auto-refreshing operations dashboard')
          loadDashboardData()
        }
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [currentMode, user?.id, profile?.id]) // Only depend on IDs to prevent recreation

  const handleModeChange = (mode) => {
    setCurrentMode(mode)
    localStorage.setItem('preferredDashboardMode', mode)
    router.push(`/dashboard?mode=${mode}`)
  }

  const handleExecutiveModeHover = useCallback(() => {
    if (currentMode !== DASHBOARD_MODES.EXECUTIVE) {
      // Use currentBarbershopId from component state first, then fallback to profile/user data
      const barbershopId = currentBarbershopId || profile?.shop_id || profile?.barbershop_id || user?.shop_id || user?.barbershop_id
      if (!barbershopId) return // Don't prefetch without barbershop ID
      fetch(`/api/analytics/live-data?barbershop_id=${barbershopId}&format=json`)
        .then(response => response.json())
        .then(result => {
          if (result.success) {
          }
        })
        .catch(() => {}) // Ignore errors for prefetch
    }
  }, [currentMode, user, currentBarbershopId])

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
        onClick={() => loadDashboardData(true)}
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
          barbershop_id: currentBarbershopId || profile?.barbershop_id || user?.barbershop_id
        }} />
        
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Mode Selector and Performance Indicator */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Main Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{modeConfigs[currentMode].description}</p>
          </div>
          <ModeSelector />
        </div>
        
        {/* Shareable Booking Link - Only show for shop owners and above */}
        {(profile?.role === 'SHOP_OWNER' || profile?.role === 'ENTERPRISE_OWNER' || profile?.role === 'SUPER_ADMIN') && (
          <ShareableBookingLink />
        )}
      </div>


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
                        onClick={() => loadDashboardData(true)}
                        className="inline-flex items-center px-4 py-2 border border-brand-300 dark:border-brand-600 text-sm font-medium rounded-lg text-brand-700 dark:text-brand-300 bg-white/70 dark:bg-brand-900/30 hover:bg-white dark:hover:bg-brand-800/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 backdrop-blur-sm"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
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
                    {retryCount >= 3 && (
                      <button
                        onClick={() => loadDashboardData(true)}
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
              {(currentBarbershopId || profile?.barbershop_id || user?.barbershop_id) && (
                <SmartAlertsPanel barbershop_id={currentBarbershopId || profile?.barbershop_id || user?.barbershop_id} />
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

