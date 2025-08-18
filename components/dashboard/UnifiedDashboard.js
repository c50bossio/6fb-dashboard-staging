'use client'

import { 
  ChartBarIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  PresentationChartLineIcon,
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

export default function UnifiedDashboard({ user, profile }) {
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

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    // Use barbershop_id from profile if available, otherwise fallback to demo
    const barbershopId = profile?.barbershop_id || user?.barbershop_id || 'demo-shop-001'
    
    setIsLoading(true)
    try {
      if (currentMode === DASHBOARD_MODES.EXECUTIVE) {
        // Use enhanced analytics endpoint for comprehensive real data
        const response = await fetch(`/api/analytics/live-data?barbershop_id=${barbershopId}&format=json&force_refresh=${forceRefresh}`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          const apiData = result.data
          
          // Transform real Supabase data for dashboard display
          const transformedData = {
            metrics: {
              revenue: apiData.total_revenue || 0,
              customers: apiData.total_customers || 0,
              appointments: apiData.total_appointments || 0,
              satisfaction: 4.5 // Default until we implement rating system
            },
            todayMetrics: {
              revenue: apiData.daily_revenue || 0,
              bookings: apiData.appointments_today || 0,
              capacity: Math.round(apiData.occupancy_rate || 0),
              nextAppointment: apiData.appointments_today > 0 ? 'Check calendar' : 'No appointments'
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
            source: result.data_source
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
          setAiAgents({
            total: 6, // Default AI agent count
            active: aiData.active_agents || 4
          })
        }

        setDashboardData(processedData)
      }
      
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData({
        error: 'Network error: Unable to load dashboard data',
        system_health: { status: 'error', database: { healthy: false } }
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentMode, user, profile])


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
      const barbershopId = profile?.barbershop_id || user?.barbershop_id || 'demo-shop-001'
      fetch(`/api/analytics/live-data?barbershop_id=${barbershopId}&format=json`)
        .then(response => response.json())
        .then(result => {
          if (result.success) {
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
                ? `${colorClasses[config.color]} text-white shadow-lg scale-105` 
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


      {/* Executive Mode Content */}
      {currentMode === DASHBOARD_MODES.EXECUTIVE && (
        <>
          {isLoading && !dashboardData ? (
            <ExecutiveLoadingState />
          ) : dashboardData ? (
            <>
              <UnifiedExecutiveSummary data={dashboardData} />
              <SmartAlertsPanel barbershop_id={profile?.barbershop_id || user?.barbershop_id || 'demo'} />
            </>
          ) : null}
        </>
      )}

      {/* Mode-specific content - Render other modes */}
      {currentMode !== DASHBOARD_MODES.EXECUTIVE && renderModeContent()}
    </div>
  )
}

