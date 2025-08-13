'use client'

import { useState } from 'react'
import { 
  ChatBubbleBottomCenterTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function AIAgentsShowcase() {
  const [activeAgent, setActiveAgent] = useState(0)

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
        "Win-back campaigns for inactive clients",
        "Personalized promotions based on service history"
      ],
      stats: {
        metric: "35%",
        label: "Average increase in rebookings"
      }
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
        "Product sales and inventory profit tracking",
        "Goal setting and progress monitoring"
      ],
      stats: {
        metric: "4 hrs",
        label: "Saved per week on bookkeeping"
      }
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
        "Loyalty program automation",
        "Personalized service recommendations"
      ],
      stats: {
        metric: "50%",
        label: "Reduction in no-shows"
      }
    },
    {
      name: "Operations AI",
      icon: ClockIcon,
      color: "from-orange-500 to-red-500",
      title: "Run Your Shop on Autopilot",
      description: "Handle the boring stuff so you can focus on cutting",
      features: [
        "Smart scheduling optimization",
        "Inventory tracking and auto-reordering",
        "Staff schedule management",
        "Equipment maintenance reminders",
        "Supply cost optimization"
      ],
      stats: {
        metric: "15%",
        label: "Increase in daily bookings"
      }
    },
    {
      name: "Growth AI",
      icon: RocketLaunchIcon,
      color: "from-indigo-500 to-gold-500",
      title: "Data-Driven Growth Strategies",
      description: "AI that learns your business and suggests improvements",
      features: [
        "Service pricing optimization",
        "Peak hour identification and scheduling",
        "New service recommendations based on trends",
        "Competitive analysis and positioning",
        "Customer acquisition cost tracking"
      ],
      stats: {
        metric: "28%",
        label: "Average revenue growth"
      }
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-olive-100 text-olive-800 rounded-full text-sm font-semibold mb-4">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            AI AUTOMATION
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI Agents That Work While You Cut
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop spending nights doing admin work. Let our AI agents handle the business 
            while you focus on what you do best - making people look great.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3 space-y-2">
            {agents.map((agent, index) => {
              const Icon = agent.icon
              return (
                <button
                  key={index}
                  onClick={() => setActiveAgent(index)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                    activeAgent === index 
                      ? 'bg-white shadow-lg border-2 border-olive-500' 
                      : 'bg-gray-50 hover:bg-white hover:shadow-md border-2 border-transparent'
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
                      <CheckCircleIcon className="h-5 w-5 text-olive-500 ml-auto" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {agents[activeAgent].title}
                  </h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-olive-600">
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

              <div className="mt-8 p-4 bg-gradient-to-r from-olive-50 to-gold-50 rounded-xl">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
                      <ClockIcon className="h-6 w-6 text-olive-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-semibold text-gray-900">
                      Set it and forget it
                    </div>
                    <div className="text-sm text-gray-600">
                      Takes just 5 minutes to set up, then runs automatically forever
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full">
            <span className="text-sm font-medium">
              All AI agents included in every plan - no add-ons or hidden fees
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}