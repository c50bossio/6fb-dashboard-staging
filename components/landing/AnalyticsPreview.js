'use client'

import { useState } from 'react'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

export default function AnalyticsPreview() {
  const [activeTab, setActiveTab] = useState('revenue')

  const dashboardPreviews = {
    revenue: {
      title: "Track Every Dollar",
      subtitle: "See exactly where your money comes from",
      metrics: [
        { label: "Monthly Revenue", value: "$18,450", change: "+12%", positive: true },
        { label: "Average Ticket", value: "$85", change: "+$5", positive: true },
        { label: "Tips Collected", value: "$2,340", change: "+18%", positive: true },
        { label: "Product Sales", value: "$1,200", change: "+22%", positive: true }
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
        { label: "Active Clients", value: "342", change: "+28", positive: true },
        { label: "Retention Rate", value: "78%", change: "+5%", positive: true },
        { label: "New This Month", value: "42", change: "+15%", positive: true },
        { label: "Avg. Visit Frequency", value: "3.2/mo", change: "+0.4", positive: true }
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
        { label: "Top Service", value: "Fade + Beard", change: "32% of bookings", positive: true },
        { label: "Fastest Growing", value: "Hot Towel Shave", change: "+45%", positive: true },
        { label: "Avg. Service Time", value: "45 min", change: "-5 min", positive: true },
        { label: "Service Mix", value: "12 types", change: "Well balanced", positive: true }
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
        { label: "YoY Growth", value: "+34%", change: "Ahead of target", positive: true },
        { label: "Client Base Growth", value: "+125", change: "This year", positive: true },
        { label: "Review Score", value: "4.9★", change: "+0.2", positive: true },
        { label: "Referral Rate", value: "42%", change: "+8%", positive: true }
      ],
      chart: {
        type: "growth",
        description: "12-month growth trend with projections"
      }
    }
  }

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
                  <ChartBarIcon className="h-5 w-5 text-blue-400 mr-2" />
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
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-3">
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
            <div className="inline-flex items-center justify-center h-12 w-12 bg-blue-900/50 text-blue-400 rounded-full mb-3">
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
            <div className="inline-flex items-center justify-center h-12 w-12 bg-purple-900/50 text-purple-400 rounded-full mb-3">
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