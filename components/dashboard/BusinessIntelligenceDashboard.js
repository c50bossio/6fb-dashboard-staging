'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import AIOptimizationPanel from './AIOptimizationPanel'
import VisitorAnalyticsChart from './VisitorAnalyticsChart'
import PerformanceMetricsPanel from './PerformanceMetricsPanel'

// Metric card component with glassmorphism effect
function MetricCard({ title, value, change, trend, subtitle, icon: Icon }) {
  const isPositive = trend === 'up'
  const TrendIcon = isPositive ? ChartBarIcon : ArrowTrendingDownIcon
  
  return (
    <div className="relative bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-200/10 dark:border-gray-700/30 hover:bg-white/10 dark:hover:bg-gray-800/40 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {value}
            </p>
            {change && (
              <div className={`ml-2 flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                <TrendIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">{change}</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className="ml-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Icon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BusinessIntelligenceDashboard() {
  const { user, profile } = useAuth()
  const [metrics, setMetrics] = useState({
    revenue: { value: '$0', change: '+0%', trend: 'up' },
    clients: { value: '0', change: '-0%', trend: 'down' },
    services: { value: '0', change: '+0%', trend: 'up' },
    margin: { value: '0%', change: '+0%', trend: 'up' }
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('3months')
  const [aiProviders, setAiProviders] = useState([
    { name: 'Anthropic', priority: 1, status: 'active', cost: '$0.250/1M', tokens: '1M' },
    { name: 'OpenAI', priority: 2, status: 'active', cost: '$0.150/1M', tokens: '1M' },
    { name: 'Google', priority: 3, status: 'active', cost: '$0.075/1M', tokens: '1M' }
  ])

  useEffect(() => {
    fetchDashboardMetrics()
  }, [user, dateRange])

  const fetchDashboardMetrics = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Fetch from our business intelligence API
      const response = await fetch('/api/analytics/business-intelligence')
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      
      const data = await response.json()
      
      // Update metrics from API response
      if (data.metrics) {
        setMetrics({
          revenue: {
            value: data.metrics.revenue.formatted || '$0.00',
            change: `${data.metrics.revenue.change >= 0 ? '+' : ''}${data.metrics.revenue.change.toFixed(1)}%`,
            trend: data.metrics.revenue.trend
          },
          clients: {
            value: data.metrics.clients.value.toString(),
            change: `${data.metrics.clients.change >= 0 ? '+' : ''}${data.metrics.clients.change.toFixed(1)}%`,
            trend: data.metrics.clients.trend
          },
          services: {
            value: data.metrics.services.value.toLocaleString(),
            change: `${data.metrics.services.change >= 0 ? '+' : ''}${data.metrics.services.change.toFixed(1)}%`,
            trend: data.metrics.services.trend
          },
          margin: {
            value: data.metrics.margin.formatted || '0%',
            change: `${data.metrics.margin.change >= 0 ? '+' : ''}${data.metrics.margin.change.toFixed(1)}%`,
            trend: data.metrics.margin.trend
          }
        })
      }
      
      // Update AI providers if available
      if (data.ai?.providers) {
        setAiProviders(data.ai.providers.map((p, i) => ({
          ...p,
          cost: `$${(p.cost / 1000000).toFixed(3)}/1M`,
          tokens: '1M'
        })))
      }
      
      // Alternative approach using Supabase directly as fallback
      const _supabase = createClient()
      
      // Fetch revenue data
      const { data: revenueData, error: revenueError } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', getDateRangeStart(dateRange))
      
      if (!revenueError && revenueData) {
        const totalRevenue = revenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        const previousRevenue = await fetchPreviousPeriodRevenue(dateRange)
        const revenueChange = calculatePercentageChange(totalRevenue, previousRevenue)
        
        setMetrics(prev => ({
          ...prev,
          revenue: {
            value: `$${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
            trend: revenueChange >= 0 ? 'up' : 'down'
          }
        }))
      }
      
      // Fetch active clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('customers')
        .select('id')
        .gte('last_visit', getDateRangeStart(dateRange))
      
      if (!clientsError && clientsData) {
        const activeClients = clientsData.length
        setMetrics(prev => ({
          ...prev,
          clients: {
            value: activeClients.toString(),
            change: '-20%', // Mock data for now
            trend: 'down'
          }
        }))
      }
      
      // Fetch services provided
      const { data: servicesData, error: servicesError } = await supabase
        .from('appointments')
        .select('id')
        .in('status', ['completed', 'confirmed'])
        .gte('date', getDateRangeStart(dateRange))
      
      if (!servicesError && servicesData) {
        const servicesCount = servicesData.length
        setMetrics(prev => ({
          ...prev,
          services: {
            value: servicesCount.toLocaleString(),
            change: '+12.5%', // Mock data for now
            trend: 'up'
          }
        }))
      }
      
      // Calculate profit margin (mock for now)
      setMetrics(prev => ({
        ...prev,
        margin: {
          value: '32.5%',
          change: '+4.5%',
          trend: 'up'
        }
      }))
      
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeStart = (_range) => {
    const now = new Date()
    switch(range) {
      case '7days':
        return new Date(now.setDate(now.getDate() - 7)).toISOString()
      case '30days':
        return new Date(now.setDate(now.getDate() - 30)).toISOString()
      case '3months':
      default:
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString()
    }
  }

  const fetchPreviousPeriodRevenue = async (_range) => {
    // Mock implementation - would fetch actual previous period data
    return 10000 // $100.00 in cents
  }

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 100
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-700/30 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Business Intelligence Dashboard</h1>
        <p className="text-gray-400">Real-time insights and analytics to grow your business with data-driven decisions.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Monthly Revenue"
          value={metrics.revenue.value}
          change={metrics.revenue.change}
          trend={metrics.revenue.trend}
          subtitle="Trending up this month"
          icon={CurrencyDollarIcon}
        />
        <MetricCard
          title="Active Clients"
          value={metrics.clients.value}
          change={metrics.clients.change}
          trend={metrics.clients.trend}
          subtitle="Acquisition needs attention"
          icon={UsersIcon}
        />
        <MetricCard
          title="Services Provided"
          value={metrics.services.value}
          change={metrics.services.change}
          trend={metrics.services.trend}
          subtitle="Strong user retention"
          icon={CalendarDaysIcon}
        />
        <MetricCard
          title="Profit Margin"
          value={metrics.margin.value}
          change={metrics.margin.change}
          trend={metrics.margin.trend}
          subtitle="Steady performance increase"
          icon={ChartBarIcon}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Visitor Analytics - Takes 2 columns */}
        <div className="lg:col-span-2">
          <VisitorAnalyticsChart dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        
        {/* AI Cost Optimization - Takes 1 column */}
        <div className="lg:col-span-1">
          <AIOptimizationPanel providers={aiProviders} />
        </div>
      </div>

      {/* Performance Metrics */}
      <PerformanceMetricsPanel />
    </div>
  )
}