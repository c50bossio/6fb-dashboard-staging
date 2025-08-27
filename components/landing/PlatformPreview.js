'use client'

import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  ClockIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function PlatformPreview() {
  const [activeView, setActiveView] = useState('agents') // 'agents' or 'analytics'
  const [activeAgent, setActiveAgent] = useState(0)
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('revenue')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
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

  // AI Agents data
  const agents = [
    {
      name: "Marketing AI",
      icon: ChatBubbleBottomCenterTextIcon,
      color: "from-olive-500 to-cyan-500",
      title: "Automated Marketing That Actually Works",
      description: "Your personal marketing team that never sleeps",
      features: [
        "Automated SMS reminders that bring clients back",
        "Smart email campaigns based on booking patterns",
        "Birthday and special occasion outreach",
        "Win-back campaigns for inactive clients"
      ],
      stats: { metric: "35%", label: "Average increase in rebookings" }
    },
    {
      name: "Financial AI",
      icon: CurrencyDollarIcon,
      color: "from-green-500 to-emerald-500",
      title: "Track Every Dollar Automatically",
      description: "Know exactly where your money is going and growing",
      features: [
        "Automatic commission and tip tracking",
        "Daily, weekly, and monthly revenue reports",
        "Expense categorization and tax prep",
        "Goal setting and progress monitoring"
      ],
      stats: { metric: "4 hrs", label: "Saved per week on bookkeeping" }
    },
    {
      name: "Client AI",
      icon: UserGroupIcon,
      color: "from-gold-500 to-pink-500",
      title: "Build Relationships at Scale",
      description: "Remember every client preference automatically",
      features: [
        "Client preference and style history",
        "Automated appointment confirmations",
        "No-show and cancellation management",
        "Personalized service recommendations"
      ],
      stats: { metric: "50%", label: "Reduction in no-shows" }
    }
  ]

  // Analytics helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatPercentage = (value) => {
    return `${Math.round(value || 0)}%`
  }

  // Analytics data structure
  const getAnalyticsPreviews = () => {
    if (isLoading) {
      return {
        revenue: {
          title: "Track Every Dollar",
          metrics: [
            { label: "Monthly Revenue", value: "Loading...", change: "...", positive: true },
            { label: "Average Ticket", value: "Loading...", change: "...", positive: true },
            { label: "Daily Revenue", value: "Loading...", change: "...", positive: true },
            { label: "Payment Success", value: "Loading...", change: "...", positive: true }
          ]
        }
      }
    }

    const data = analyticsData?.formatted_metrics || {}
    return {
      revenue: {
        title: "Track Every Dollar",
        metrics: [
          { label: "Monthly Revenue", value: formatCurrency(data.monthly_revenue || 8450), change: "+12%", positive: true },
          { label: "Average Ticket", value: formatCurrency(data.average_service_price || 65), change: "+$5", positive: true },
          { label: "Daily Revenue", value: formatCurrency(data.daily_revenue || 340), change: "+18%", positive: true },
          { label: "Payment Success", value: formatPercentage(data.payment_success_rate || 97), change: "+0.2%", positive: true }
        ]
      }
    }
  }

  const analyticsPreviews = getAnalyticsPreviews()

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-brand-100 to-brand-50 text-brand-800 rounded-full text-sm font-semibold mb-4">
            <SparklesIcon className="h-4 w-4 mr-2" />
            PLATFORM PREVIEW
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            See Your Business in Action
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Real AI automation and live analytics working together to grow your barbershop. 
            This is what running a smart business looks like.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 rounded-xl p-2">
            <button
              onClick={() => setActiveView('agents')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeView === 'agents'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2" />
                AI Automation
              </div>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeView === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Live Analytics
              </div>
            </button>
          </div>
        </div>

        {/* AI Agents View */}
        {activeView === 'agents' && (
          <div className="mb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Agent Selector */}
                  <div className="lg:w-1/3 space-y-3">
                    {agents.map((agent, index) => {
                      const Icon = agent.icon
                      return (
                        <button
                          key={index}
                          onClick={() => setActiveAgent(index)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                            activeAgent === index 
                              ? 'bg-gradient-to-r from-brand-50 to-brand-100 border-2 border-brand-500' 
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white flex-shrink-0`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                              <p className="text-sm text-gray-500">Click to explore</p>
                            </div>
                            {activeAgent === index && (
                              <CheckCircleIcon className="h-5 w-5 text-brand-600 ml-auto" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Agent Details */}
                  <div className="lg:w-2/3">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {agents[activeAgent].title}
                        </h3>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-brand-600">
                            {agents[activeAgent].stats.metric}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agents[activeAgent].stats.label}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600">
                        {agents[activeAgent].description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 mb-3">What it does for you:</h4>
                      {agents[activeAgent].features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="ml-3 text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-brand-50 to-brand-25 rounded-xl border border-brand-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-md">
                            <ClockIcon className="h-5 w-5 text-brand-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            Set it and forget it
                          </div>
                          <div className="text-sm text-gray-600">
                            Takes 5 minutes to set up, runs automatically forever
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="mb-16">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
              <div className="p-8">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">
                      {analyticsPreviews.revenue.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-400">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Live Preview
                    </div>
                  </div>
                  <p className="text-gray-300">
                    Real-time insights from actual barbershop data
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {analyticsPreviews.revenue.metrics.map((metric, index) => (
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
                  <div className="h-32 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center h-12 w-12 bg-gradient-to-br from-brand-600 to-brand-500 rounded-full mb-2">
                        <ChartBarIcon className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-gray-400 text-sm">
                        Interactive charts update in real-time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-xl mb-4">
              <RocketLaunchIcon className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">AI That Works</h4>
            <p className="text-gray-600">
              Smart automation that learns your business and gets better over time
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-green-600 to-green-500 text-white rounded-xl mb-4">
              <ArrowTrendingUpIcon className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Real-Time Insights</h4>
            <p className="text-gray-600">
              See changes as they happen, not next month in a report
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-gold-600 to-gold-500 text-white rounded-xl mb-4">
              <EyeIcon className="h-7 w-7" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Your Data, Private</h4>
            <p className="text-gray-600">
              Only you see your numbers - no competitors, no marketplace sharing
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full font-semibold">
            <span className="text-sm">
              All features included in every plan - no add-ons or hidden fees
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}