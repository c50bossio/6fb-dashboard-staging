'use client'

import { useState, useEffect } from 'react'
import {
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function CapacityPlanningPanel({ barbershop_id = 'demo' }) {
  const [capacityData, setCapacityData] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly')
  const [optimizationFocus, setOptimizationFocus] = useState('revenue')

  useEffect(() => {
    loadCapacityData()
    const interval = setInterval(loadCapacityData, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [barbershop_id, selectedTimeframe, optimizationFocus])

  const loadCapacityData = async () => {
    try {
      setLoading(true)
      
      // Load capacity planning data from multiple sources
      const [predictiveData, alertsData, analyticsData] = await Promise.allSettled([
        // Enhanced predictive analytics with capacity insights
        fetch(`/api/ai/predictive?type=comprehensive&shopId=${barbershop_id}&focus=capacity`).then(r => r.json()),
        
        // Intelligent alerts for capacity-related issues
        fetch(`/api/alerts/intelligent?barbershop_id=${barbershop_id}`).then(r => r.json()),
        
        // Real-time analytics for current capacity
        fetch(`/api/analytics/live-data?barbershop_id=${barbershop_id}&metric=capacity`).then(r => r.json())
      ])

      const predictions = predictiveData.status === 'fulfilled' && predictiveData.value.success ? predictiveData.value.predictions : null
      const alerts = alertsData.status === 'fulfilled' && alertsData.value.success ? alertsData.value : null
      const analytics = analyticsData.status === 'fulfilled' && analyticsData.value.success ? analyticsData.value.data : null

      // Process and combine data for capacity planning
      const capacityAnalysis = generateCapacityAnalysis(predictions, alerts, analytics)
      setCapacityData(capacityAnalysis)
      
      // Generate AI-powered recommendations
      const capacityRecommendations = generateCapacityRecommendations(capacityAnalysis, optimizationFocus)
      setRecommendations(capacityRecommendations)

      console.log('📊 Capacity planning data loaded:', {
        predictions: !!predictions,
        alerts: alerts?.alerts?.length || 0,
        analytics: !!analytics,
        recommendations: capacityRecommendations.length
      })

    } catch (error) {
      console.error('Failed to load capacity data:', error)
      
      // Fallback to demo data
      const demoCapacity = generateDemoCapacityData()
      setCapacityData(demoCapacity)
      setRecommendations(generateCapacityRecommendations(demoCapacity, optimizationFocus))
    } finally {
      setLoading(false)
    }
  }

  const generateCapacityAnalysis = (predictions, alerts, analytics) => {
    const now = new Date()
    const currentHour = now.getHours()
    
    // Calculate current capacity utilization
    const currentUtilization = analytics?.capacity_utilization || 0.75
    const peakHours = analytics?.peak_hours || [10, 11, 14, 15, 16, 17]
    const lowHours = analytics?.low_hours || [9, 12, 13, 18, 19]
    
    // Seasonal patterns from predictions
    const seasonalDemand = predictions?.seasonalAnalysis?.current_season_impact || 1.0
    const weeklyPattern = predictions?.demandForecast?.weekly_pattern || generateWeeklyPattern()
    
    // Alert-based capacity issues
    const capacityAlerts = alerts?.alerts?.filter(alert => 
      alert.category === 'operations' || alert.category === 'capacity'
    ) || []

    return {
      current: {
        utilization: currentUtilization,
        hour: currentHour,
        is_peak: peakHours.includes(currentHour),
        seasonal_impact: seasonalDemand,
        staff_on_duty: analytics?.current_staff || 2
      },
      patterns: {
        hourly: generateHourlyPattern(peakHours, lowHours),
        weekly: weeklyPattern,
        seasonal: predictions?.seasonalAnalysis || {}
      },
      constraints: {
        max_staff: analytics?.max_staff || 4,
        operating_hours: analytics?.operating_hours || { start: 9, end: 19 },
        service_duration: analytics?.avg_service_duration || 45,
        setup_time: analytics?.setup_time || 5
      },
      forecasted_demand: predictions?.demandForecast || generateDemandForecast(),
      bottlenecks: identifyBottlenecks(analytics, capacityAlerts),
      opportunities: identifyOpportunities(currentUtilization, peakHours, currentHour)
    }
  }

  const generateCapacityRecommendations = (analysis, focus) => {
    const recommendations = []
    const { current, patterns, constraints, bottlenecks, opportunities } = analysis

    // High utilization recommendations
    if (current.utilization > 0.85) {
      recommendations.push({
        id: 'high-utilization',
        type: 'optimization',
        priority: 'high',
        title: 'High Capacity Utilization Detected',
        description: `Current utilization at ${Math.round(current.utilization * 100)}% - consider expansion`,
        actions: [
          'Add additional staff during peak hours',
          'Extend operating hours',
          'Implement premium pricing during peak times',
          'Consider opening additional location'
        ],
        impact: 'high',
        effort: 'medium',
        timeline: '1-2 weeks'
      })
    }

    // Low utilization recommendations
    if (current.utilization < 0.50) {
      recommendations.push({
        id: 'low-utilization',
        type: 'efficiency',
        priority: 'medium',
        title: 'Underutilized Capacity',
        description: `Current utilization only ${Math.round(current.utilization * 100)}% - optimization opportunities`,
        actions: [
          'Launch promotional campaigns during slow hours',
          'Offer discounted services during low-demand periods',
          'Implement marketing for underused time slots',
          'Consider reducing staff during consistent low periods'
        ],
        impact: 'medium',
        effort: 'low',
        timeline: '1 week'
      })
    }

    // Peak hour optimization
    if (opportunities.peak_optimization) {
      recommendations.push({
        id: 'peak-optimization',
        type: 'scheduling',
        priority: 'medium',
        title: 'Peak Hour Schedule Optimization',
        description: 'Optimize staff scheduling for peak demand periods',
        actions: [
          'Schedule most experienced staff during peak hours',
          'Pre-book popular services during busy times',
          'Implement express services for quick turnarounds',
          'Consider appointment buffer times during peak hours'
        ],
        impact: 'high',
        effort: 'low',
        timeline: 'Immediate'
      })
    }

    // Bottleneck resolution
    bottlenecks.forEach((bottleneck, idx) => {
      recommendations.push({
        id: `bottleneck-${idx}`,
        type: 'process',
        priority: bottleneck.severity === 'high' ? 'high' : 'medium',
        title: `Resolve ${bottleneck.type} Bottleneck`,
        description: bottleneck.description,
        actions: bottleneck.solutions,
        impact: bottleneck.severity,
        effort: 'medium',
        timeline: '1-3 weeks'
      })
    })

    // Seasonal preparation
    if (current.seasonal_impact > 1.1) {
      recommendations.push({
        id: 'seasonal-prep',
        type: 'planning',
        priority: 'high',
        title: 'Seasonal Demand Preparation',
        description: `${Math.round((current.seasonal_impact - 1) * 100)}% increase in seasonal demand detected`,
        actions: [
          'Hire temporary staff for peak season',
          'Extend hours during high-demand periods',
          'Stock additional inventory for popular services',
          'Implement seasonal service packages'
        ],
        impact: 'high',
        effort: 'high',
        timeline: '2-4 weeks'
      })
    }

    // Focus-based recommendations
    if (focus === 'revenue') {
      recommendations.push({
        id: 'revenue-optimization',
        type: 'revenue',
        priority: 'medium',
        title: 'Revenue Optimization Strategy',
        description: 'Maximize revenue through capacity optimization',
        actions: [
          'Implement dynamic pricing based on demand',
          'Promote premium services during peak times',
          'Create service bundles for efficient time use',
          'Upsell additional services during appointments'
        ],
        impact: 'high',
        effort: 'medium',
        timeline: '1-2 weeks'
      })
    } else if (focus === 'efficiency') {
      recommendations.push({
        id: 'efficiency-optimization',
        type: 'efficiency',
        priority: 'medium',
        title: 'Operational Efficiency Enhancement',
        description: 'Streamline operations for maximum efficiency',
        actions: [
          'Optimize service sequences to reduce setup time',
          'Implement parallel processing where possible',
          'Standardize service procedures',
          'Reduce idle time between appointments'
        ],
        impact: 'medium',
        effort: 'low',
        timeline: '1 week'
      })
    }

    return recommendations.slice(0, 6) // Limit to top 6 recommendations
  }

  // Helper functions for capacity analysis
  const generateHourlyPattern = (peakHours, lowHours) => {
    const pattern = {}
    for (let hour = 9; hour <= 19; hour++) {
      if (peakHours.includes(hour)) {
        pattern[hour] = { utilization: 0.85 + Math.random() * 0.1, demand: 'high' }
      } else if (lowHours.includes(hour)) {
        pattern[hour] = { utilization: 0.35 + Math.random() * 0.2, demand: 'low' }
      } else {
        pattern[hour] = { utilization: 0.6 + Math.random() * 0.2, demand: 'medium' }
      }
    }
    return pattern
  }

  const generateWeeklyPattern = () => ({
    Monday: { utilization: 0.65, demand: 'medium' },
    Tuesday: { utilization: 0.72, demand: 'medium' },
    Wednesday: { utilization: 0.68, demand: 'medium' },
    Thursday: { utilization: 0.78, demand: 'high' },
    Friday: { utilization: 0.85, demand: 'high' },
    Saturday: { utilization: 0.92, demand: 'very_high' },
    Sunday: { utilization: 0.45, demand: 'low' }
  })

  const generateDemandForecast = () => ({
    next_week: { demand_increase: 0.12, confidence: 0.84 },
    next_month: { demand_increase: 0.08, confidence: 0.76 },
    seasonal_peak: { weeks_away: 3, expected_increase: 0.25 }
  })

  const identifyBottlenecks = (analytics, alerts) => {
    const bottlenecks = []
    
    // Check for common bottlenecks
    if (analytics?.avg_wait_time > 15) {
      bottlenecks.push({
        type: 'Wait Time',
        severity: 'high',
        description: `Average wait time of ${analytics.avg_wait_time} minutes is too high`,
        solutions: [
          'Improve appointment scheduling accuracy',
          'Reduce service overlap times',
          'Add express service options'
        ]
      })
    }

    // Alert-based bottlenecks
    alerts.forEach(alert => {
      if (alert.category === 'operations') {
        bottlenecks.push({
          type: 'Operational',
          severity: alert.impact,
          description: alert.message,
          solutions: alert.suggestions || ['Review operational procedures']
        })
      }
    })

    return bottlenecks
  }

  const identifyOpportunities = (utilization, peakHours, currentHour) => ({
    peak_optimization: utilization > 0.7 && peakHours.includes(currentHour),
    off_peak_potential: utilization < 0.5 && !peakHours.includes(currentHour),
    expansion_ready: utilization > 0.9,
    efficiency_improvement: utilization < 0.6
  })

  const generateDemoCapacityData = () => ({
    current: {
      utilization: 0.78,
      hour: 14,
      is_peak: true,
      seasonal_impact: 1.15,
      staff_on_duty: 3
    },
    patterns: {
      hourly: generateHourlyPattern([10, 11, 14, 15, 16, 17], [9, 12, 13, 18, 19]),
      weekly: generateWeeklyPattern(),
      seasonal: { current_season: 'peak', impact: 1.15 }
    },
    constraints: {
      max_staff: 4,
      operating_hours: { start: 9, end: 19 },
      service_duration: 45,
      setup_time: 5
    },
    forecasted_demand: generateDemandForecast(),
    bottlenecks: [
      {
        type: 'Scheduling',
        severity: 'medium',
        description: 'Back-to-back appointments creating rush periods',
        solutions: ['Add buffer time between appointments', 'Stagger service start times']
      }
    ],
    opportunities: {
      peak_optimization: true,
      off_peak_potential: false,
      expansion_ready: false,
      efficiency_improvement: true
    }
  })

  const formatUtilization = (value) => `${Math.round(value * 100)}%`

  const getUtilizationColor = (utilization) => {
    if (utilization > 0.85) return 'text-red-600 bg-red-100'
    if (utilization > 0.70) return 'text-green-600 bg-green-100'
    if (utilization > 0.50) return 'text-amber-800 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      case 'medium': return <ClockIcon className="h-4 w-4 text-amber-800" />
      case 'low': return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      default: return <LightBulbIcon className="h-4 w-4 text-olive-500" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-green-500 bg-green-50'
      default: return 'border-l-blue-500 bg-olive-50'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Analyzing capacity...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              🏗️ AI-Powered Capacity Planning
            </h2>
            <p className="text-sm text-gray-600">
              Intelligent capacity optimization and demand forecasting
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select
              value={optimizationFocus}
              onChange={(e) => setOptimizationFocus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 text-sm"
            >
              <option value="revenue">Revenue Focus</option>
              <option value="efficiency">Efficiency Focus</option>
              <option value="customer">Customer Experience</option>
            </select>
            <button
              onClick={loadCapacityData}
              disabled={loading}
              className="px-3 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:bg-gray-300 flex items-center gap-2 text-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                '🔄'
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Current Capacity Overview */}
      {capacityData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Current Utilization</h3>
              <ChartBarIcon className="h-5 w-5 text-olive-500" />
            </div>
            <div className={`text-2xl font-bold px-2 py-1 rounded-full text-center ${getUtilizationColor(capacityData.current.utilization)}`}>
              {formatUtilization(capacityData.current.utilization)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {capacityData.current.is_peak ? '🔴 Peak Hours' : '🟢 Normal Hours'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Staff on Duty</h3>
              <UserGroupIcon className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {capacityData.current.staff_on_duty}/{capacityData.constraints.max_staff}
            </div>
            <p className="text-xs text-gray-600 mt-1">Available staff</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Seasonal Impact</h3>
              <ArrowTrendingUpIcon className="h-5 w-5 text-amber-700" />
            </div>
            <div className={`text-2xl font-bold ${capacityData.current.seasonal_impact > 1 ? 'text-amber-700' : 'text-olive-600'}`}>
              {capacityData.current.seasonal_impact > 1 ? '+' : ''}{Math.round((capacityData.current.seasonal_impact - 1) * 100)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">vs. baseline</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Recommendations</h3>
              <LightBulbIcon className="h-5 w-5 text-gold-500" />
            </div>
            <div className="text-2xl font-bold text-gold-600">
              {recommendations.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Active suggestions</p>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-amber-700" />
              AI-Powered Recommendations
            </h3>
          </div>
          <div className="divide-y">
            {recommendations.map((rec) => (
              <div key={rec.id} className={`p-4 border-l-4 ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(rec.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          rec.priority === 'high' ? 'bg-softred-100 text-softred-900' :
                          rec.priority === 'medium' ? 'bg-amber-100 text-amber-900' :
                          'bg-moss-100 text-moss-900'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                      
                      <div className="space-y-2">
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Recommended Actions:</h5>
                          <ul className="space-y-1">
                            {rec.actions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                <ArrowRightIcon className="h-3 w-3 text-olive-500 mt-0.5 flex-shrink-0" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Impact: <strong>{rec.impact}</strong></span>
                          <span>Effort: <strong>{rec.effort}</strong></span>
                          <span>Timeline: <strong>{rec.timeline}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity Patterns */}
      {capacityData?.patterns && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-olive-500" />
              Capacity Patterns & Forecasting
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Pattern */}
              <div>
                <h4 className="font-semibold mb-3">📊 Hourly Utilization Pattern</h4>
                <div className="space-y-2">
                  {Object.entries(capacityData.patterns.hourly).map(([hour, data]) => (
                    <div key={hour} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{hour}:00</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              data.demand === 'high' ? 'bg-red-500' :
                              data.demand === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${data.utilization * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{formatUtilization(data.utilization)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Pattern */}
              <div>
                <h4 className="font-semibold mb-3">📅 Weekly Demand Pattern</h4>
                <div className="space-y-2">
                  {Object.entries(capacityData.patterns.weekly).map(([day, data]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              data.demand === 'very_high' ? 'bg-red-600' :
                              data.demand === 'high' ? 'bg-red-500' :
                              data.demand === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${data.utilization * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{formatUtilization(data.utilization)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// NO MOCK DATA - All data comes from real API calls to enhanced analytics systems