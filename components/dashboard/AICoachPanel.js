'use client'

import { useState } from 'react'
import {
  SparklesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MegaphoneIcon,
  CogIcon,
  LightBulbIcon,
  TrophyIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function AICoachPanel({ data }) {
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [isLoadingInsight, setIsLoadingInsight] = useState(false)
  
  const agents = data?.agents || []
  const insights = data?.insights || []
  const recommendations = data?.recommendations || []

  const coaches = [
    {
      id: 'financial',
      name: 'Financial Coach',
      icon: CurrencyDollarIcon,
      color: 'green',
      description: 'Revenue optimization & financial planning',
      status: agents.find(a => a.name === 'Financial Coach')?.status || 'active',
      insights: [
        'Peak hours are 25% under-priced compared to market',
        'Tuesday promotions could increase revenue by $3,000/month',
        'Consider bundle packages for regular customers'
      ]
    },
    {
      id: 'strategic',
      name: 'Strategic Pricing',
      icon: ChartBarIcon,
      color: 'blue',
      description: 'Dynamic pricing & market positioning',
      status: agents.find(a => a.name === 'Strategic Pricing')?.status || 'active',
      insights: [
        'Implement surge pricing for Saturday mornings',
        'Loyalty program could increase retention by 30%',
        'Service bundling opportunity identified'
      ]
    },
    {
      id: 'marketing',
      name: 'Marketing Expert',
      icon: MegaphoneIcon,
      color: 'purple',
      description: 'Customer acquisition & engagement',
      status: agents.find(a => a.name === 'Marketing Expert')?.status || 'active',
      insights: [
        'Social media engagement up 40% this month',
        'Email campaign ROI: 5.2x',
        'Referral program ready for launch'
      ]
    },
    {
      id: 'operations',
      name: 'Operations Manager',
      icon: CogIcon,
      color: 'amber',
      description: 'Efficiency & resource optimization',
      status: agents.find(a => a.name === 'Operations Manager')?.status || 'idle',
      insights: [
        'Staff utilization at 85% - optimal range',
        'Appointment gaps reduced by 20%',
        'Supply costs optimized, saving $500/month'
      ]
    }
  ]

  const handleCoachInteraction = async (coach) => {
    setSelectedCoach(coach)
    setIsLoadingInsight(true)
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: coach.id,
          prompt: `Provide business insight for ${coach.name}`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('AI Coach response:', data)
      }
    } catch (error) {
      console.error('Failed to get AI insight:', error)
    } finally {
      setIsLoadingInsight(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Coaches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coaches.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            onInteract={() => handleCoachInteraction(coach)}
            isSelected={selectedCoach?.id === coach.id}
            isLoading={isLoadingInsight && selectedCoach?.id === coach.id}
          />
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LightBulbIcon className="h-6 w-6 text-amber-700" />
            AI Business Recommendations
          </h3>
          <span className="text-sm text-gray-500">
            Powered by collective AI intelligence
          </span>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <RecommendationCard key={index} recommendation={rec} />
          ))}
          
          {recommendations.length === 0 && (
            <div className="text-center py-8">
              <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">AI coaches are analyzing your business...</p>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Interface */}
      {selectedCoach && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-olive-500" />
              Conversation with {selectedCoach.name}
            </h3>
            <button
              onClick={() => setSelectedCoach(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="space-y-4">
            {selectedCoach.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <selectedCoach.icon className={`h-5 w-5 text-${selectedCoach.color}-500 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{insight}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="text-xs text-olive-600 hover:text-indigo-800">
                      Learn more
                    </button>
                    <span className="text-gray-300">•</span>
                    <button className="text-xs text-olive-600 hover:text-indigo-800">
                      Take action
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Ask ${selectedCoach.name} a question...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm hover:bg-olive-600 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CoachCard = ({ coach, onInteract, isSelected, isLoading }) => {
  const Icon = coach.icon
  const statusColors = {
    active: 'bg-moss-100 text-moss-900',
    idle: 'bg-gray-100 text-gray-600',
    busy: 'bg-amber-100 text-amber-800'
  }

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all
        ${isSelected 
          ? `border-${coach.color}-500 shadow-lg scale-[1.02]` 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
      onClick={onInteract}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-${coach.color}-50 rounded-xl`}>
          <Icon className={`h-8 w-8 text-${coach.color}-500`} />
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[coach.status]}`}>
          {coach.status}
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-1">{coach.name}</h4>
      <p className="text-sm text-gray-600 mb-3">{coach.description}</p>

      <div className="space-y-2">
        <div className="text-xs text-gray-500">Latest insight:</div>
        <p className="text-sm text-gray-700 line-clamp-2">
          {coach.insights[0]}
        </p>
      </div>

      <button className={`
        mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors
        ${isLoading 
          ? 'bg-gray-100 text-gray-400 cursor-wait' 
          : `bg-${coach.color}-50 text-${coach.color}-700 hover:bg-${coach.color}-100`
        }
      `}>
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <ClockIcon className="h-4 w-4 animate-spin" />
            Thinking...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Get Insights
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        )}
      </button>
    </div>
  )
}

const RecommendationCard = ({ recommendation }) => {
  const impactColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-amber-50 border-amber-200',
    low: 'bg-olive-50 border-olive-200'
  }

  const confidenceLevel = Math.round(recommendation.confidence * 100)

  return (
    <div className={`p-4 rounded-lg border ${impactColors[recommendation.impact]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            {recommendation.title}
          </h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-medium">
              {recommendation.revenue}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">
              {confidenceLevel}% confidence
            </span>
          </div>
        </div>
        <button className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-olive-600 hover:bg-indigo-50 transition-colors">
          Implement
        </button>
      </div>
      
      {/* Confidence bar */}
      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
          style={{ width: `${confidenceLevel}%` }}
        />
      </div>
    </div>
  )
}