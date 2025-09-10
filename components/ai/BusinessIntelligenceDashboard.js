'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function BusinessIntelligenceDashboard() {
  const [performanceData, setPerformanceData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading business performance data
    setTimeout(() => {
      setPerformanceData({
        revenue: {
          current: 24500,
          previous: 22800,
          trend: 'up',
          percentage: 7.5
        },
        appointments: {
          current: 312,
          previous: 298,
          trend: 'up',
          percentage: 4.7
        },
        customerSatisfaction: {
          current: 4.6,
          previous: 4.4,
          trend: 'up',
          percentage: 4.5
        },
        utilization: {
          current: 85,
          previous: 78,
          trend: 'up',
          percentage: 9.0
        }
      })
      setLoading(false)
    }, 1500)
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const TrendIndicator = ({ trend, percentage }) => {
    const isUp = trend === 'up'
    const Icon = isUp ? ArrowUpIcon : ArrowDownIcon
    const colorClass = isUp ? 'text-green-600' : 'text-red-600'
    
    return (
      <div className={`flex items-center space-x-1 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    )
  }

  const MetricCard = ({ title, current, previous, trend, percentage, formatter = (val) => val, unit = '' }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <TrendIndicator trend={trend} percentage={percentage} />
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900">
          {formatter(current)}{unit}
        </span>
        <span className="text-sm text-gray-500">
          vs {formatter(previous)}{unit}
        </span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="text-center text-gray-500">Loading business intelligence data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Revenue"
          current={performanceData.revenue.current}
          previous={performanceData.revenue.previous}
          trend={performanceData.revenue.trend}
          percentage={performanceData.revenue.percentage}
          formatter={formatCurrency}
        />
        <MetricCard
          title="Total Appointments"
          current={performanceData.appointments.current}
          previous={performanceData.appointments.previous}
          trend={performanceData.appointments.trend}
          percentage={performanceData.appointments.percentage}
        />
        <MetricCard
          title="Customer Satisfaction"
          current={performanceData.customerSatisfaction.current}
          previous={performanceData.customerSatisfaction.previous}
          trend={performanceData.customerSatisfaction.trend}
          percentage={performanceData.customerSatisfaction.percentage}
          unit="/5"
        />
        <MetricCard
          title="Capacity Utilization"
          current={performanceData.utilization.current}
          previous={performanceData.utilization.previous}
          trend={performanceData.utilization.trend}
          percentage={performanceData.utilization.percentage}
          unit="%"
        />
      </div>

      {/* Business Intelligence Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">AI Business Intelligence Summary</h3>
            <div className="space-y-3 text-blue-800">
              <p>
                <strong>Revenue Growth:</strong> Excellent 7.5% increase this month driven by higher appointment volume and improved service mix. 
                Focus on maintaining this momentum through premium service promotion.
              </p>
              <p>
                <strong>Operational Efficiency:</strong> 85% capacity utilization is near optimal. Consider implementing dynamic pricing 
                for peak hours to maximize revenue while maintaining service quality.
              </p>
              <p>
                <strong>Customer Experience:</strong> 4.6/5 satisfaction score with 4.5% improvement. Continue investing in staff training 
                and consider implementing a customer feedback loop for continuous improvement.
              </p>
              <p>
                <strong>Growth Opportunities:</strong> Current performance indicates readiness for premium positioning. 
                Consider introducing VIP services or expanding operating hours during high-demand periods.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h4>
          <div className="relative h-32 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-end justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">↗️</div>
              <div className="text-sm text-green-600">+7.5% Growth</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Satisfaction</h4>
          <div className="relative h-32 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-end justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">⭐</div>
              <div className="text-sm text-blue-600">4.6/5 Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="text-yellow-800">
              <strong>Peak Hour Optimization</strong>
              <p className="text-sm mt-1">Implement premium pricing (15-20% increase) during 6-8 PM slots to maximize revenue.</p>
            </div>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <div className="text-green-800">
              <strong>Service Expansion</strong>
              <p className="text-sm mt-1">Add beard grooming services - 68% of customers show interest based on inquiry patterns.</p>
            </div>
          </div>
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
            <div className="text-purple-800">
              <strong>Customer Retention</strong>
              <p className="text-sm mt-1">Launch loyalty program targeting 30+ age group - highest retention potential segment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="text-center text-xs text-gray-500">
        Data updated in real-time • AI analysis powered by 5 specialized agents • 
        <button className="text-blue-500 hover:underline ml-1">View detailed analytics</button>
      </div>
    </div>
  )
}