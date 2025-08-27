'use client'

import { 
  ChartBarIcon,
  UserGroupIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  HeartIcon,
  ShareIcon,
  StarIcon,
  MapIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  CalendarIcon,
  FunnelIcon,
  PresentationChartLineIcon,
  DocumentChartBarIcon,
  CursorArrowRippleIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js'
import { useState, useEffect, useMemo } from 'react'
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
)

const MetricCard = ({ title, value, change, changeType, icon: Icon, format = 'number', trend }) => {
  const formatValue = (val) => {
    if (format === 'percentage') return `${Math.round(val * 100)}%`
    if (format === 'currency') return `$${val.toLocaleString()}`
    if (format === 'time') return `${Math.round(val)}s`
    if (format === 'decimal') return val.toFixed(2)
    return val.toLocaleString()
  }

  const getTrendColor = () => {
    if (changeType === 'positive') return 'text-green-600'
    if (changeType === 'negative') return 'text-red-600'
    return 'text-gray-600'
  }

  const TrendIcon = changeType === 'positive' ? ArrowTrendingUpIcon : 
                   changeType === 'negative' ? ArrowTrendingDownIcon : ClockIcon

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {changeType === 'positive' ? '+' : changeType === 'negative' ? '-' : ''}
              {formatValue(Math.abs(change))}
            </span>
          </div>
        )}
      </div>
      
      {/* Trend Sparkline */}
      {trend && trend.length > 0 && (
        <div className="mt-4 h-8">
          <svg className="w-full h-full" viewBox="0 0 100 20">
            <polyline
              fill="none"
              stroke={changeType === 'positive' ? '#10B981' : changeType === 'negative' ? '#EF4444' : '#6B7280'}
              strokeWidth="1.5"
              points={trend.map((val, idx) => `${(idx / (trend.length - 1)) * 100},${20 - (val / Math.max(...trend)) * 15}`).join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  )
}

const EngagementHeatmap = ({ data }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  const getIntensity = (day, hour) => {
    const key = `${day}-${hour}`
    const value = data[key] || 0
    return Math.min(value / 100, 1) // Normalize to 0-1
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement Heatmap</h3>
      <div className="space-y-1">
        {days.map(day => (
          <div key={day} className="flex items-center space-x-1">
            <div className="w-12 text-xs text-gray-600 text-right">{day}</div>
            <div className="flex space-x-1">
              {hours.map(hour => {
                const intensity = getIntensity(day, hour)
                return (
                  <div
                    key={hour}
                    className="w-3 h-3 rounded-sm border border-gray-200"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                    }}
                    title={`${day} ${hour}:00 - ${Math.round(intensity * 100)}% engagement`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  )
}

const CustomizationCompletionFunnel = ({ data }) => {
  const stages = [
    { name: 'Started Customization', value: data.started || 0 },
    { name: 'Profile Section', value: data.profile || 0 },
    { name: 'Branding Section', value: data.branding || 0 },
    { name: 'Services Section', value: data.services || 0 },
    { name: 'Preview Generated', value: data.preview || 0 },
    { name: 'Settings Saved', value: data.saved || 0 }
  ]

  const maxValue = Math.max(...stages.map(s => s.value))

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <FunnelIcon className="w-5 h-5 text-blue-600" />
        <span>Customization Completion Funnel</span>
      </h3>
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
          const conversionRate = index > 0 ? (stage.value / stages[index - 1].value) * 100 : 100
          
          return (
            <div key={stage.name} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{stage.value.toLocaleString()}</span>
                  {index > 0 && (
                    <span className={`ml-2 text-xs ${
                      conversionRate >= 70 ? 'text-green-600' : 
                      conversionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      ({Math.round(conversionRate)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      conversionRate >= 70 ? 'bg-green-500' : 
                      conversionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Optimization Insights</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {stages.map((stage, index) => {
            if (index === 0) return null
            const conversionRate = (stage.value / stages[index - 1].value) * 100
            if (conversionRate < 50) {
              return (
                <li key={index}>• High drop-off at {stage.name} ({Math.round(100 - conversionRate)}% exit rate)</li>
              )
            }
            return null
          }).filter(Boolean)}
        </ul>
      </div>
    </div>
  )
}

const FeatureUsageChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.feature),
    datasets: [
      {
        label: 'Usage Rate',
        data: data.map(item => item.usageRate),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      },
      {
        label: 'Completion Rate',
        data: data.map(item => item.completionRate),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Feature Usage & Completion Rates'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <Bar data={chartData} options={options} />
    </div>
  )
}

const BookingConversionChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Page Views',
        data: data.map(item => item.pageViews),
        borderColor: 'rgba(156, 163, 175, 1)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Booking Attempts',
        data: data.map(item => item.bookingAttempts),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Successful Bookings',
        data: data.map(item => item.successfulBookings),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Conversion Rate',
        data: data.map(item => (item.successfulBookings / item.pageViews) * 100),
        borderColor: 'rgba(245, 101, 101, 1)',
        backgroundColor: 'rgba(245, 101, 101, 0.1)',
        tension: 0.3,
        yAxisID: 'y1',
        type: 'line'
      }
    ]
  }

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Booking Conversion Analysis'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Count'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Conversion Rate (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <Line data={chartData} options={options} />
    </div>
  )
}

const SixFigureBarberMetrics = ({ data }) => {
  const metrics = [
    {
      category: 'Premium Positioning',
      score: data.premiumPositioning || 0,
      components: [
        { name: 'Pricing Strategy', value: data.pricingStrategy || 0 },
        { name: 'Service Presentation', value: data.servicePresentation || 0 },
        { name: 'Brand Positioning', value: data.brandPositioning || 0 }
      ]
    },
    {
      category: 'Client Relationships',
      score: data.clientRelationships || 0,
      components: [
        { name: 'Retention Rate', value: data.retentionRate || 0 },
        { name: 'Referral Generation', value: data.referralGeneration || 0 },
        { name: 'Client Communication', value: data.clientCommunication || 0 }
      ]
    },
    {
      category: 'Revenue Optimization',
      score: data.revenueOptimization || 0,
      components: [
        { name: 'Upselling Success', value: data.upselling || 0 },
        { name: 'Premium Service Adoption', value: data.premiumServices || 0 },
        { name: 'Revenue per Client', value: data.revenuePerClient || 0 }
      ]
    },
    {
      category: 'Professional Growth',
      score: data.professionalGrowth || 0,
      components: [
        { name: 'Skills Development', value: data.skillsDevelopment || 0 },
        { name: 'Industry Recognition', value: data.industryRecognition || 0 },
        { name: 'Business Expansion', value: data.businessExpansion || 0 }
      ]
    }
  ]

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
        <TrophyIcon className="w-5 h-5 text-yellow-600" />
        <span>Six Figure Barber Methodology Alignment</span>
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{metric.category}</h4>
              <div className={`text-2xl font-bold ${
                metric.score >= 80 ? 'text-green-600' :
                metric.score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(metric.score)}%
              </div>
            </div>
            
            <div className="space-y-2">
              {metric.components.map((component, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{component.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          component.value >= 80 ? 'bg-green-500' :
                          component.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${component.value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-10 text-right">
                      {Math.round(component.value)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Recommendations */}
            {metric.score < 70 && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800 font-medium mb-1">Improvement Opportunity</p>
                <p className="text-xs text-yellow-700">
                  {metric.category === 'Premium Positioning' && 'Focus on premium service presentation and value-based pricing strategies.'}
                  {metric.category === 'Client Relationships' && 'Implement client retention programs and referral incentives.'}
                  {metric.category === 'Revenue Optimization' && 'Develop upselling techniques and premium service packages.'}
                  {metric.category === 'Professional Growth' && 'Invest in skills development and industry networking.'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const DeviceAndLocationAnalytics = ({ deviceData, locationData }) => {
  const deviceChart = {
    labels: deviceData.map(item => item.device),
    datasets: [
      {
        data: deviceData.map(item => item.percentage),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  }

  const deviceOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Device Usage'
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Device Analytics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="h-64">
          <Doughnut data={deviceChart} options={deviceOptions} />
        </div>
        <div className="mt-4 space-y-2">
          {deviceData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                {item.device === 'Mobile' && <DevicePhoneMobileIcon className="w-4 h-4 text-blue-600" />}
                {item.device === 'Desktop' && <ComputerDesktopIcon className="w-4 h-4 text-green-600" />}
                {item.device === 'Tablet' && <DevicePhoneMobileIcon className="w-4 h-4 text-red-600" />}
                <span className="text-gray-700">{item.device}</span>
              </div>
              <span className="font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location Analytics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MapIcon className="w-5 h-5 text-blue-600" />
          <span>Geographic Distribution</span>
        </h3>
        <div className="space-y-3">
          {locationData.map((location, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <GlobeAltIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{location.city}</div>
                  <div className="text-sm text-gray-500">{location.country}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{location.visits}</div>
                <div className="text-sm text-gray-500">{location.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdvancedAnalyticsDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [analytics, setAnalytics] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Mock data for demonstration
  const mockAnalytics = useMemo(() => ({
    overview: {
      totalViews: 15420,
      uniqueVisitors: 8760,
      conversionRate: 0.245,
      averageTimeOnSite: 142,
      bounceRate: 0.34,
      bookingConversionRate: 0.078
    },
    trends: {
      views: [120, 135, 145, 160, 155, 170, 165, 180, 175, 190, 185, 200],
      conversions: [8, 12, 15, 18, 16, 22, 20, 25, 23, 28, 26, 32]
    },
    engagementHeatmap: {
      'Mon-9': 45, 'Mon-10': 67, 'Mon-11': 89, 'Mon-12': 95, 'Mon-13': 78,
      'Tue-9': 52, 'Tue-10': 74, 'Tue-11': 92, 'Tue-12': 88, 'Tue-13': 71,
      // ... more heatmap data
    },
    completionFunnel: {
      started: 1000,
      profile: 850,
      branding: 720,
      services: 650,
      preview: 580,
      saved: 520
    },
    featureUsage: [
      { feature: 'Color Customization', usageRate: 85, completionRate: 78 },
      { feature: 'Logo Upload', usageRate: 72, completionRate: 89 },
      { feature: 'Service Management', usageRate: 91, completionRate: 82 },
      { feature: 'Template Selection', usageRate: 67, completionRate: 95 },
      { feature: 'Preview Generation', usageRate: 88, completionRate: 76 }
    ],
    bookingConversion: [
      { date: '2024-01-01', pageViews: 450, bookingAttempts: 67, successfulBookings: 45 },
      { date: '2024-01-02', pageViews: 520, bookingAttempts: 78, successfulBookings: 52 },
      { date: '2024-01-03', pageViews: 480, bookingAttempts: 72, successfulBookings: 48 },
      { date: '2024-01-04', pageViews: 610, bookingAttempts: 89, successfulBookings: 63 },
      { date: '2024-01-05', pageViews: 590, bookingAttempts: 85, successfulBookings: 59 },
      { date: '2024-01-06', pageViews: 680, bookingAttempts: 95, successfulBookings: 71 },
      { date: '2024-01-07', pageViews: 720, bookingAttempts: 102, successfulBookings: 78 }
    ],
    sixFigureMetrics: {
      premiumPositioning: 78,
      pricingStrategy: 82,
      servicePresentation: 75,
      brandPositioning: 77,
      clientRelationships: 71,
      retentionRate: 85,
      referralGeneration: 68,
      clientCommunication: 60,
      revenueOptimization: 69,
      upselling: 72,
      premiumServices: 65,
      revenuePerClient: 70,
      professionalGrowth: 84,
      skillsDevelopment: 88,
      industryRecognition: 79,
      businessExpansion: 85
    },
    deviceData: [
      { device: 'Mobile', percentage: 68 },
      { device: 'Desktop', percentage: 28 },
      { device: 'Tablet', percentage: 4 }
    ],
    locationData: [
      { city: 'New York', country: 'USA', visits: 2840, percentage: 18.4 },
      { city: 'Los Angeles', country: 'USA', visits: 2156, percentage: 14.0 },
      { city: 'Chicago', country: 'USA', visits: 1523, percentage: 9.9 },
      { city: 'Houston', country: 'USA', visits: 1287, percentage: 8.3 },
      { city: 'Miami', country: 'USA', visits: 1094, percentage: 7.1 }
    ]
  }), [])

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      setAnalytics(mockAnalytics)
      setLoading(false)
    }, 1500)
  }, [mockAnalytics, dateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics & Insights</h2>
          <p className="text-gray-600 mt-1">
            Deep insights into your customization performance and user engagement
          </p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page Views"
          value={analytics.overview.totalViews}
          change={2340}
          changeType="positive"
          icon={EyeIcon}
          trend={analytics.trends.views}
        />
        <MetricCard
          title="Unique Visitors"
          value={analytics.overview.uniqueVisitors}
          change={890}
          changeType="positive"
          icon={UserGroupIcon}
        />
        <MetricCard
          title="Conversion Rate"
          value={analytics.overview.conversionRate}
          change={0.023}
          changeType="positive"
          icon={CursorArrowRaysIcon}
          format="percentage"
        />
        <MetricCard
          title="Avg. Time on Site"
          value={analytics.overview.averageTimeOnSite}
          change={12}
          changeType="positive"
          icon={ClockIcon}
          format="time"
        />
      </div>

      {/* Six Figure Barber Methodology Metrics */}
      <SixFigureBarberMetrics data={analytics.sixFigureMetrics} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingConversionChart data={analytics.bookingConversion} />
        <FeatureUsageChart data={analytics.featureUsage} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomizationCompletionFunnel data={analytics.completionFunnel} />
        <EngagementHeatmap data={analytics.engagementHeatmap} />
      </div>

      {/* Device and Location Analytics */}
      <DeviceAndLocationAnalytics 
        deviceData={analytics.deviceData} 
        locationData={analytics.locationData} 
      />

      {/* Insights and Recommendations */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <PresentationChartLineIcon className="w-5 h-5 text-blue-600" />
          <span>AI-Powered Insights & Recommendations</span>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Performance Insights</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Strong Mobile Performance</p>
                  <p className="text-sm text-green-700">68% of traffic comes from mobile devices with high engagement</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Conversion Rate Improvement</p>
                  <p className="text-sm text-blue-700">24.5% conversion rate exceeds industry average by 8.2%</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Customization Drop-off</p>
                  <p className="text-sm text-yellow-700">35% of users abandon customization at the branding section</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Optimization Recommendations</h4>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">Simplify Branding Section</p>
                <p className="text-sm text-gray-600">Reduce form fields and add progress indicators to improve completion rate</p>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">Enhance Mobile UX</p>
                <p className="text-sm text-gray-600">Optimize touch targets and improve mobile navigation flow</p>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">A/B Test Color Schemes</p>
                <p className="text-sm text-gray-600">Test warmer color palettes to potentially increase conversion rates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}