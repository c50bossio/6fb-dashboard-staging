'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline'
import { 
  ChartBarIcon as ChartBarSolid,
  CpuChipIcon as CpuChipSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  SparklesIcon as SparklesSolid,
  PresentationChartLineIcon as PresentationChartSolid
} from '@heroicons/react/24/solid'

// Import existing components we'll integrate
import AICoachPanel from './AICoachPanel'
import AnalyticsPanel from './AnalyticsPanel'
import PredictiveAnalyticsPanel from './PredictiveAnalyticsPanel'
import ActionCenter from './ActionCenter'
import UnifiedExecutiveSummary from './UnifiedExecutiveSummary'
import SmartAlertsPanel from './SmartAlertsPanel'

// Dashboard modes for different user needs
const DASHBOARD_MODES = {
  EXECUTIVE: 'executive',
  AI_INSIGHTS: 'ai_insights', 
  ANALYTICS: 'analytics',
  PREDICTIVE: 'predictive',
  OPERATIONS: 'operations'
}

// Mode configurations
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

  // Load dashboard data based on current mode
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch data based on current mode
      const endpoints = {
        [DASHBOARD_MODES.EXECUTIVE]: ['/api/dashboard/metrics', '/api/ai/insights'],
        [DASHBOARD_MODES.AI_INSIGHTS]: ['/api/ai/agents/status', '/api/ai/insights', '/api/business-recommendations'],
        [DASHBOARD_MODES.ANALYTICS]: ['/api/analytics/live-data', '/api/analytics/predictive', '/api/franchise/performance'],
        [DASHBOARD_MODES.OPERATIONS]: ['/api/appointments', '/api/alerts/active', '/api/realtime/metrics']
      }

      const responses = await Promise.all(
        endpoints[currentMode].map(endpoint => 
          fetch(endpoint).then(res => res.ok ? res.json() : null).catch(() => null)
        )
      )

      // Process responses based on mode
      let processedData = {}
      
      if (currentMode === DASHBOARD_MODES.EXECUTIVE) {
        processedData = {
          metrics: responses[0]?.data || generateMockMetrics(),
          insights: responses[1]?.insights || generateMockInsights()
        }
      } else if (currentMode === DASHBOARD_MODES.AI_INSIGHTS) {
        const agentStatus = responses[0]
        setAiAgents({
          total: agentStatus?.total_agents || 7,
          active: agentStatus?.active_agents || 3
        })
        processedData = {
          agents: agentStatus?.agents || generateMockAgents(),
          insights: responses[1]?.insights || generateMockInsights(),
          recommendations: responses[2]?.recommendations || generateMockRecommendations()
        }
      } else if (currentMode === DASHBOARD_MODES.ANALYTICS) {
        processedData = {
          liveData: responses[0]?.data || generateMockAnalytics(),
          predictive: responses[1]?.predictions || generateMockPredictions(),
          performance: responses[2]?.locations || generateMockLocationPerformance()
        }
      } else if (currentMode === DASHBOARD_MODES.OPERATIONS) {
        processedData = {
          appointments: responses[0]?.data || [],
          alerts: responses[1]?.alerts || [],
          realtime: responses[2]?.metrics || generateMockRealtimeMetrics()
        }
      }

      setDashboardData(processedData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Use mock data on error
      setDashboardData(generateMockDataForMode(currentMode))
    } finally {
      setIsLoading(false)
    }
  }, [currentMode])

  // Handle URL parameter for mode
  useEffect(() => {
    if (modeParam && Object.values(DASHBOARD_MODES).includes(modeParam)) {
      setCurrentMode(modeParam)
    } else {
      // Load saved mode from localStorage if no URL param
      const savedMode = localStorage.getItem('preferredDashboardMode')
      if (savedMode && Object.values(DASHBOARD_MODES).includes(savedMode)) {
        setCurrentMode(savedMode)
      }
    }
  }, [modeParam])

  // Load data on mount and mode change
  useEffect(() => {
    loadDashboardData()
    
    // Set up auto-refresh every 30 seconds for operations mode
    if (currentMode === DASHBOARD_MODES.OPERATIONS) {
      const interval = setInterval(loadDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [currentMode, loadDashboardData])

  const handleModeChange = (mode) => {
    setCurrentMode(mode)
    localStorage.setItem('preferredDashboardMode', mode)
    // Update URL to reflect the mode change
    router.push(`/dashboard?mode=${mode}`)
  }

  // Mode selector component
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
        onClick={loadDashboardData}
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

  // Render content based on current mode
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
        // Executive Summary is now rendered directly in the main component above
        return null
        
      case DASHBOARD_MODES.AI_INSIGHTS:
        return (
          <div className="space-y-6">
            {/* AI System Status */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">AI System Status</h3>
                  <p className="text-purple-100">Intelligent agents powering your business</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiAgents.total}</div>
                    <div className="text-sm text-purple-100">Total Agents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiAgents.active}</div>
                    <div className="text-sm text-purple-100">Active Now</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Operational</span>
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
      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Main Dashboard</h2>
          <p className="text-gray-600 mt-1">{modeConfigs[currentMode].description}</p>
        </div>
        <ModeSelector />
      </div>

      {/* Unified Executive Summary - Only for Executive mode - Consolidated view */}
      {currentMode === DASHBOARD_MODES.EXECUTIVE && dashboardData && (
        <>
          <UnifiedExecutiveSummary data={dashboardData} />
          <SmartAlertsPanel barbershop_id={user?.barbershop_id || 'demo'} />
        </>
      )}

      {/* Mode-specific content - Render other modes */}
      {currentMode !== DASHBOARD_MODES.EXECUTIVE && renderModeContent()}
    </div>
  )
}

// Mock data generators
const generateMockMetrics = () => ({
  revenue: 145000,
  customers: 1210,
  appointments: 324,
  satisfaction: 4.65
})

const generateMockInsights = () => ([
  { type: 'opportunity', message: 'Weekend bookings up 25% - consider premium pricing', priority: 'high' },
  { type: 'alert', message: 'Tuesday bookings consistently slow - promotional opportunity', priority: 'medium' },
  { type: 'success', message: 'Customer retention improved by 15% this month', priority: 'low' }
])

const generateMockAgents = () => ([
  { name: 'Financial Coach', status: 'active', lastInsight: 'Optimize pricing for peak hours' },
  { name: 'Marketing Expert', status: 'active', lastInsight: 'Social media engagement up 40%' },
  { name: 'Operations Manager', status: 'idle', lastInsight: 'Staff utilization at optimal levels' }
])

const generateMockRecommendations = () => ([
  { title: 'Implement Dynamic Pricing', impact: 'high', revenue: '+$12,000/month', confidence: 0.89 },
  { title: 'Add Express Services', impact: 'medium', revenue: '+$5,000/month', confidence: 0.76 },
  { title: 'Expand Tuesday Promotions', impact: 'medium', revenue: '+$3,000/month', confidence: 0.82 }
])

const generateMockAnalytics = () => ({
  revenue_by_location: [
    { location: 'Downtown', revenue: 45000, customers: 380 },
    { location: 'Midtown', revenue: 38000, customers: 315 },
    { location: 'Westside', revenue: 33000, customers: 275 },
    { location: 'Eastside', revenue: 29000, customers: 240 }
  ],
  trending_services: [
    { service: 'Premium Cut', bookings: 145, growth: 23 },
    { service: 'Beard Trim', bookings: 98, growth: 15 },
    { service: 'Full Service', bookings: 76, growth: -5 }
  ]
})

const generateMockPredictions = () => ({
  next_week_revenue: 32000,
  next_week_bookings: 280,
  busy_periods: ['Monday 10-12', 'Friday 2-5', 'Saturday 9-1']
})

const generateMockPredictiveData = () => ({
  id: `demo_forecast_${Date.now()}`,
  type: 'comprehensive',
  timeHorizon: 'weekly',
  generated_at: new Date().toISOString(),
  overallConfidence: 0.84,
  revenueForecast: {
    currentRevenue: 1350,
    predictions: {
      '1_day': { value: 1280, confidence: 0.91, trend: 'stable' },
      '1_week': { value: 8950, confidence: 0.86, trend: 'increasing' },
      '1_month': { value: 39200, confidence: 0.79, trend: 'increasing' }
    },
    factors: [
      'Holiday season demand increase (+18%)',
      'Customer retention improvement (+12%)',
      'Premium service uptake (+8%)'
    ],
    recommendations: [
      'Extend holiday hours to capture peak demand',
      'Promote premium services to loyal customers',
      'Implement holiday booking incentives'
    ]
  },
  customerBehavior: {
    segments: [
      {
        name: 'VIP Customers',
        size: 92,
        retentionRate: 0.94,
        predictedGrowth: 0.06,
        avgMonthlyValue: 195,
        recommendations: [
          'Offer exclusive holiday packages',
          'Provide VIP scheduling priority'
        ]
      }
    ],
    churnPrediction: {
      highRisk: 15,
      mediumRisk: 32,
      lowRisk: 388,
      interventionRecommendations: [
        'Priority outreach to high-risk customers',
        'Satisfaction surveys for medium-risk segment'
      ]
    }
  },
  demandForecast: {
    peakHours: ['10:00-12:00', '14:00-16:00', '17:00-19:00'],
    peakDays: ['Friday', 'Saturday', 'Sunday'],
    servicePopularity: [
      { service: 'Classic Haircut', demandTrend: 'stable', growth: 0.03 },
      { service: 'Beard Styling', demandTrend: 'increasing', growth: 0.18 }
    ],
    capacityUtilization: {
      current: 0.76,
      predicted: 0.84,
      peakUtilization: 0.97,
      optimizationOpportunity: 0.13
    }
  },
  pricingOptimization: {
    services: [
      {
        name: 'Classic Haircut',
        currentPrice: 30,
        optimalPrice: 34,
        revenueImpact: '+11%',
        recommendation: 'Gradual price increase over 6 weeks'
      }
    ],
    dynamicPricingOpportunities: [
      'Weekend premium pricing (+18%)',
      'Peak hour surge pricing (+15%)'
    ]
  }
})

const generateMockLocationPerformance = () => ([
  { name: 'Downtown Elite', efficiency: 92, rating: 4.8, revenue: 45000 },
  { name: 'Midtown Barber Co', efficiency: 87, rating: 4.6, revenue: 38000 },
  { name: 'Westside Style', efficiency: 85, rating: 4.7, revenue: 33000 },
  { name: 'Eastside Cuts', efficiency: 79, rating: 4.5, revenue: 29000 }
])

const generateMockRealtimeMetrics = () => ({
  active_appointments: 3,
  waiting_customers: 2,
  available_barbers: 4,
  next_available: '11:30 AM'
})

const generateMockDataForMode = (mode) => {
  switch (mode) {
    case DASHBOARD_MODES.EXECUTIVE:
      return { metrics: generateMockMetrics(), insights: generateMockInsights() }
    case DASHBOARD_MODES.AI_INSIGHTS:
      return { 
        agents: generateMockAgents(), 
        insights: generateMockInsights(), 
        recommendations: generateMockRecommendations() 
      }
    case DASHBOARD_MODES.ANALYTICS:
      return { 
        liveData: generateMockAnalytics(), 
        predictive: generateMockPredictions(), 
        performance: generateMockLocationPerformance() 
      }
    case DASHBOARD_MODES.PREDICTIVE:
      return {
        predictions: generateMockPredictiveData()
      }
    case DASHBOARD_MODES.OPERATIONS:
      return { 
        appointments: [], 
        alerts: [], 
        realtime: generateMockRealtimeMetrics() 
      }
    default:
      return {}
  }
}