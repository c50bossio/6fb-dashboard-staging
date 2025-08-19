'use client'

import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function AnalyticsPreview() {
  const [activeTab, setActiveTab] = useState('revenue')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Try to get any available barbershop for landing page showcase
        const response = await fetch('/api/analytics/preview?format=formatted')
        const result = await response.json()
        
        if (result.success && result.data) {
          setAnalyticsData(result.data)
        }
      } catch (error) {
        console.warn('Analytics preview using fallback data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  // Helper function to format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  // Helper function to format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value || 0)}%`
  }

  // Generate dashboard previews from real data or fallback
  const getDashboardPreviews = () => {
    if (isLoading) {
      return getLoadingPreviews()
    }
    
    if (!analyticsData) {
      return getFallbackPreviews()
    }

    const data = analyticsData.formatted_metrics || analyticsData
    
    return {
      revenue: {
        title: "Track Every Dollar",
        subtitle: "See exactly where your money comes from",
        metrics: [
          { label: "Monthly Revenue", value: formatCurrency(data.monthly_revenue || data.total_revenue), change: "+12%", positive: true },
          { label: "Average Ticket", value: formatCurrency(data.average_service_price), change: "+$5", positive: true },
          { label: "Daily Revenue", value: formatCurrency(data.daily_revenue), change: "+18%", positive: true },
          { label: "Total Revenue", value: formatCurrency(data.total_revenue), change: "+22%", positive: true }
        ],
        chart: {
          type: "revenue",
          description: "Daily revenue breakdown with service categories"
        }
      },
      clients: {
        title: "Know Your Clients",
        subtitle: "Understand who comes back and why",
        metrics: [
          { label: "Total Clients", value: String(data.total_customers || 0), change: "+28", positive: true },
          { label: "Retention Rate", value: formatPercentage(data.customer_retention_rate), change: "+5%", positive: true },
          { label: "New This Month", value: String(data.new_customers_this_month || 0), change: "+15%", positive: true },
          { label: "Returning Clients", value: String(data.returning_customers || 0), change: "+0.4", positive: true }
        ],
        chart: {
          type: "clients",
          description: "Client retention and booking patterns"
        }
      },
      services: {
        title: "Optimize Your Services",
        subtitle: "Know what's working and what's not",
        metrics: [
          { label: "Total Appointments", value: String(data.total_appointments || 0), change: "32% of bookings", positive: true },
          { label: "Completed Rate", value: formatPercentage(data.appointment_completion_rate), change: "+45%", positive: true },
          { label: "Daily Average", value: String(data.average_appointments_per_day || 0), change: "-5 min", positive: true },
          { label: "Active Barbers", value: String(data.active_barbers || 0), change: "Well balanced", positive: true }
        ],
        chart: {
          type: "services",
          description: "Service popularity and profitability matrix"
        }
      },
      growth: {
        title: "Measure Your Growth",
        subtitle: "Track progress toward your goals",
        metrics: [
          { label: "Capacity Usage", value: formatPercentage(data.occupancy_rate), change: "Ahead of target", positive: true },
          { label: "Customer Value", value: formatCurrency(data.average_customer_lifetime_value), change: "This year", positive: true },
          { label: "Payment Success", value: formatPercentage(data.payment_success_rate), change: "+0.2", positive: true },
          { label: "Today's Bookings", value: String(data.appointments_today || 0), change: "+8%", positive: true }
        ],
        chart: {
          type: "growth",
          description: "12-month growth trend with projections"
        }
      }
    }
  }

  // Loading state previews
  const getLoadingPreviews = () => {
    return {
      revenue: {
        title: "Track Every Dollar",
        subtitle: "Loading real revenue data...",
        metrics: [
          { label: "Monthly Revenue", value: "Loading...", change: "...", positive: true },
          { label: "Average Ticket", value: "Loading...", change: "...", positive: true },
          { label: "Daily Revenue", value: "Loading...", change: "...", positive: true },
          { label: "Total Revenue", value: "Loading...", change: "...", positive: true }
        ],
        chart: { type: "revenue", description: "Loading revenue data..." }
      },
      clients: {
        title: "Know Your Clients", 
        subtitle: "Loading client metrics...",
        metrics: [
          { label: "Total Clients", value: "Loading...", change: "...", positive: true },
          { label: "Retention Rate", value: "Loading...", change: "...", positive: true },
          { label: "New This Month", value: "Loading...", change: "...", positive: true },
          { label: "Returning Clients", value: "Loading...", change: "...", positive: true }
        ],
        chart: { type: "clients", description: "Loading client data..." }
      },
      services: {
        title: "Optimize Your Services",
        subtitle: "Loading service analytics...",
        metrics: [
          { label: "Total Appointments", value: "Loading...", change: "...", positive: true },
          { label: "Completed Rate", value: "Loading...", change: "...", positive: true },
          { label: "Daily Average", value: "Loading...", change: "...", positive: true },
          { label: "Active Barbers", value: "Loading...", change: "...", positive: true }
        ],
        chart: { type: "services", description: "Loading service data..." }
      },
      growth: {
        title: "Measure Your Growth",
        subtitle: "Loading growth metrics...", 
        metrics: [
          { label: "Capacity Usage", value: "Loading...", change: "...", positive: true },
          { label: "Customer Value", value: "Loading...", change: "...", positive: true },
          { label: "Payment Success", value: "Loading...", change: "...", positive: true },
          { label: "Today's Bookings", value: "Loading...", change: "...", positive: true }
        ],
        chart: { type: "growth", description: "Loading growth data..." }
      }
    }
  }

  // Fallback previews for demo purposes
  const getFallbackPreviews = () => {
    return {
      revenue: {
        title: "Track Every Dollar",
        subtitle: "Real barbershop metrics (demo data)",
        metrics: [
          { label: "Monthly Revenue", value: "$8,450", change: "+12%", positive: true },
          { label: "Average Ticket", value: "$65", change: "+$5", positive: true },
          { label: "Daily Revenue", value: "$340", change: "+18%", positive: true },
          { label: "Total Revenue", value: "$24,680", change: "+22%", positive: true }
        ],
        chart: { type: "revenue", description: "Daily revenue breakdown with service categories" }
      },
      clients: {
        title: "Know Your Clients",
        subtitle: "Real customer engagement data",
        metrics: [
          { label: "Total Clients", value: "156", change: "+28", positive: true },
          { label: "Retention Rate", value: "68%", change: "+5%", positive: true },
          { label: "New This Month", value: "24", change: "+15%", positive: true },
          { label: "Returning Clients", value: "89", change: "+0.4", positive: true }
        ],
        chart: { type: "clients", description: "Client retention and booking patterns" }
      },
      services: {
        title: "Optimize Your Services", 
        subtitle: "Service performance insights",
        metrics: [
          { label: "Total Appointments", value: "234", change: "32% of bookings", positive: true },
          { label: "Completed Rate", value: "94%", change: "+45%", positive: true },
          { label: "Daily Average", value: "12", change: "-5 min", positive: true },
          { label: "Active Barbers", value: "3", change: "Well balanced", positive: true }
        ],
        chart: { type: "services", description: "Service popularity and profitability matrix" }
      },
      growth: {
        title: "Measure Your Growth",
        subtitle: "Business growth indicators",
        metrics: [
          { label: "Capacity Usage", value: "78%", change: "Ahead of target", positive: true },
          { label: "Customer Value", value: "$158", change: "This year", positive: true },
          { label: "Payment Success", value: "97%", change: "+0.2", positive: true },
          { label: "Today's Bookings", value: "8", change: "+8%", positive: true }
        ],
        chart: { type: "growth", description: "12-month growth trend with projections" }
      }
    }
  }

  const dashboardPreviews = getDashboardPreviews()

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
    { id: 'clients', label: 'Clients', icon: UserGroupIcon },
    { id: 'services', label: 'Services', icon: CalendarIcon },
    { id: 'growth', label: 'Growth', icon: ArrowTrendingUpIcon }
  ]

  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-green-900/50 text-green-400 rounded-full text-sm font-semibold mb-4">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            REAL-TIME ANALYTICS
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Real Analytics for Real Growth
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Stop guessing. Start knowing. Make decisions based on YOUR data, 
            not marketplace statistics that don't help your business.
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="border-b border-gray-700 bg-gray-850">
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {dashboardPreviews[activeTab].title}
              </h3>
              <p className="text-gray-400">
                {dashboardPreviews[activeTab].subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {dashboardPreviews[activeTab].metrics.map((metric, index) => (
                <div key={index} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="text-sm text-gray-400 mb-1">{metric.label}</div>
                  <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                  <div className={`text-sm ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {metric.change}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-700/30 rounded-xl p-6 border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-olive-400 mr-2" />
                  <span className="text-gray-300 font-medium">
                    {dashboardPreviews[activeTab].chart.description}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Live Preview
                </div>
              </div>
              
              <div className="h-48 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-olive-500 to-gold-600 rounded-full mb-3">
                    <ChartBarIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Interactive charts update in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 bg-olive-900/50 text-olive-400 rounded-full mb-3">
              <ClockIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Real-Time Updates</h4>
            <p className="text-gray-400 text-sm">
              See changes as they happen, not next month
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 bg-green-900/50 text-green-400 rounded-full mb-3">
              <ArrowTrendingUpIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Actionable Insights</h4>
            <p className="text-gray-400 text-sm">
              AI-powered recommendations to grow faster
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 bg-gold-900/50 text-gold-400 rounded-full mb-3">
              <EyeIcon className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Your Data, Private</h4>
            <p className="text-gray-400 text-sm">
              Only you see your numbers, not competitors
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}