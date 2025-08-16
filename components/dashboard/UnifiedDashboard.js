'use client'

import { 
  ChartBarIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  PresentationChartLineIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { 
  ChartBarIcon as ChartBarSolid,
  CpuChipIcon as CpuChipSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  SparklesIcon as SparklesSolid,
  PresentationChartLineIcon as PresentationChartSolid
} from '@heroicons/react/24/solid'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

import ActionCenter from './ActionCenter'
import AICoachPanel from './AICoachPanel'
import AnalyticsPanel from './AnalyticsPanel'
import ExecutiveLoadingState from './ExecutiveLoadingState'
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel'
import SmartAlertsPanel from './SmartAlertsPanel'
import UnifiedExecutiveSummary from './UnifiedExecutiveSummary'


const DASHBOARD_MODES = {
  EXECUTIVE: 'executive',
  AI_INSIGHTS: 'ai_insights', 
  ANALYTICS: 'analytics',
  PREDICTIVE: 'predictive',
  OPERATIONS: 'operations'
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
    icon: SparklesIcon,
    solidIcon: SparklesSolid,
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

export default function UnifiedDashboard({ user }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modeParam = searchParams.get('mode')
  
  const [currentMode, setCurrentMode] = useState(DASHBOARD_MODES.EXECUTIVE)
  const [isLoading, setIsLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [aiAgents, setAiAgents] = useState({ total: 0, active: 0 })
  const [notifications, setNotifications] = useState([])
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [cachedData, setCachedData] = useState(null)
  const [cacheTimestamp, setCacheTimestamp] = useState(null)
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false)

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    const barbershopId = user?.barbershop_id || 'demo-shop-001'
    
    
    setIsLoading(true)
    try {
      console.log(`Loading dashboard data for mode: ${currentMode}`)
      
      if (currentMode === DASHBOARD_MODES.EXECUTIVE) {
        const response = await fetch(`/api/analytics/live-data?barbershop_id=${barbershopId}&format=json&force_refresh=true`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          const apiData = result.data
          const transformedData = {
            metrics: {
              revenue: apiData.total_revenue || 0,
              customers: apiData.total_customers || 0,
              appointments: apiData.total_appointments || 0,
              satisfaction: 4.5 // Default satisfaction score
            },
            todayMetrics: {
              revenue: apiData.daily_revenue || 0,
              bookings: Math.round((apiData.total_appointments || 0) / 30), // Estimated daily bookings
              capacity: Math.round((apiData.occupancy_rate || 0) * 100),
              nextAppointment: 'No appointments'
            },
            business_insights: {
              active_barbershops: 1,
              total_ai_recommendations: 0,
              user_satisfaction_score: 4.5
            },
            user_engagement: {
              active_users: apiData.total_customers || 0,
              total_users: apiData.total_customers || 0,
              new_users: apiData.new_customers_this_month || 0,
              retention_rate: Math.round(apiData.customer_retention_rate || 0)
            },
            system_health: {
              status: 'healthy',
              database: { healthy: true }
            },
            performance: {
              avg_response_time_ms: 127,
              api_success_rate: 99.2,
              uptime_percent: 99.8
            },
            analytics_data: apiData
          }
          setDashboardData(transformedData)
        } else {
          console.warn('Analytics API error:', result)
          setDashboardData({})
        }
      } else {
        const response = await fetch(`/api/dashboard/metrics?mode=${currentMode}&barbershop_id=${barbershopId}`)
        const processedData = await response.json()
        
        if (!response.ok) {
          console.warn('Dashboard API error:', processedData)
          setDashboardData({})
          return
        }
        
        if (currentMode === DASHBOARD_MODES.AI_INSIGHTS && processedData.agents) {
          setAiAgents({
            total: processedData.agents.length,
            active: processedData.agents.filter(agent => agent.status === 'active').length
          })
        }

        setDashboardData(processedData)
      }
      
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData({})
    } finally {
      setIsLoading(false)
    }
  }, [currentMode, user])

  const handleDismissOnboardingBanner = () => {
    localStorage.removeItem('show_onboarding_checklist')
    setShowOnboardingBanner(false)
  }

  const handleResumeOnboarding = () => {
    // Will be handled by DashboardOnboarding component
    console.log('Resume onboarding triggered')
  }

  useEffect(() => {
    if (modeParam && Object.values(DASHBOARD_MODES).includes(modeParam)) {
      setCurrentMode(modeParam)
    } else if (!modeParam) {
      const savedMode = localStorage.getItem('preferredDashboardMode')
      if (savedMode && Object.values(DASHBOARD_MODES).includes(savedMode)) {
        setCurrentMode(savedMode)
        router.replace(`/dashboard?mode=${savedMode}`)
      } else {
        setCurrentMode(DASHBOARD_MODES.EXECUTIVE)
        router.replace(`/dashboard?mode=${DASHBOARD_MODES.EXECUTIVE}`)
      }
    }
  }, [modeParam, router])

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const showOnboardingChecklist = localStorage.getItem('show_onboarding_checklist')
      setShowOnboardingBanner(showOnboardingChecklist === 'true')
    }
    
    checkOnboardingStatus()
    
    window.addEventListener('storage', checkOnboardingStatus)
    return () => window.removeEventListener('storage', checkOnboardingStatus)
  }, [])

  useEffect(() => {
    loadDashboardData()
    
    if (currentMode === DASHBOARD_MODES.OPERATIONS) {
      const interval = setInterval(loadDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [currentMode, loadDashboardData])

  const handleModeChange = (mode) => {
    setCurrentMode(mode)
    localStorage.setItem('preferredDashboardMode', mode)
    router.push(`/dashboard?mode=${mode}`)
  }

  const handleExecutiveModeHover = useCallback(() => {
    if (currentMode !== DASHBOARD_MODES.EXECUTIVE) {
      const barbershopId = user?.barbershop_id || 'demo-shop-001'
      fetch(`/api/analytics/live-data?barbershop_id=${barbershopId}&format=json`)
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            console.log('Executive data prefetched')
          }
        })
        .catch(() => {}) // Ignore errors for prefetch
    }
  }, [currentMode, user])

  const ModeSelector = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-2">
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
                ? `bg-${config.color}-500 text-white shadow-lg scale-105` 
                : `bg-gray-50 text-gray-700 hover:bg-gray-100`
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
        className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
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
            <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      )
    }

    switch (currentMode) {
      case DASHBOARD_MODES.EXECUTIVE:
        return null
        
      case DASHBOARD_MODES.AI_INSIGHTS:
        return (
          <div className="space-y-6">
            {/* AI Business Insights Header */}
            <div className="bg-gradient-to-r from-gold-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">AI Business Insights</h3>
                  <p className="text-gold-100">Intelligent recommendations to grow your business</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiAgents.total || 6}</div>
                    <div className="text-sm text-gold-100">AI Coaches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiAgents.active || 4}</div>
                    <div className="text-sm text-gold-100">Working for You</div>
                  </div>
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
        return <ActionCenter data={dashboardData} />
        
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
            <h2 className="text-2xl font-bold text-gray-900">Main Dashboard</h2>
            <p className="text-gray-600 mt-1">{modeConfigs[currentMode].description}</p>
          </div>
          <ModeSelector />
        </div>
        
      </div>

      {/* Onboarding Resume Banner */}
      {showOnboardingBanner && (
        <div className="bg-gradient-to-r from-olive-50 to-blue-50 border border-olive-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-olive-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Complete Your Account Setup
                </h3>
                <p className="text-sm text-gray-600">
                  Finish setting up your barbershop profile to unlock all features and start accepting bookings.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResumeOnboarding}
                className="bg-olive-600 hover:bg-olive-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Resume Setup
              </button>
              <button
                onClick={handleDismissOnboardingBanner}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
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
              <SmartAlertsPanel barbershop_id={user?.barbershop_id || 'demo'} />
            </>
          ) : null}
        </>
      )}

      {/* Mode-specific content - Render other modes */}
      {currentMode !== DASHBOARD_MODES.EXECUTIVE && renderModeContent()}
    </div>
  )
}

