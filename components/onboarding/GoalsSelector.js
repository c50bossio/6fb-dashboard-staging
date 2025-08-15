'use client'

import {
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  SparklesIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const goalsByTier = {
  barber: [
    {
      id: 'buy_time_back',
      title: 'Buy My Time Back',
      description: 'Work fewer hours while maintaining or increasing income',
      icon: ClockIcon
    },
    {
      id: 'increase_rates',
      title: 'Increase My Rates',
      description: 'Justify higher prices through professional booking experience',
      icon: CurrencyDollarIcon
    },
    {
      id: 'reduce_no_shows',
      title: 'Reduce No-Shows',
      description: 'Eliminate wasted time slots with automated reminders and deposits',
      icon: CalendarDaysIcon
    },
    {
      id: 'premium_brand',
      title: 'Build Premium Brand',
      description: 'Stand out with a professional online presence that commands higher rates',
      icon: SparklesIcon
    },
    {
      id: 'automate_communication',
      title: 'Automate Client Communication',
      description: 'Save hours weekly with automated booking, reminders, and follow-ups',
      icon: GlobeAltIcon
    }
  ],
  shop: [
    {
      id: 'bookings',
      title: 'Increase Shop Bookings',
      description: 'Maximize appointments across all barbers',
      icon: CalendarDaysIcon
    },
    {
      id: 'management',
      title: 'Manage Staff Better',
      description: 'Streamline scheduling and team coordination',
      icon: UsersIcon
    },
    {
      id: 'finances',
      title: 'Track Finances',
      description: 'Monitor revenue, commissions, and expenses',
      icon: CurrencyDollarIcon
    },
    {
      id: 'presence',
      title: 'Build Shop Brand',
      description: 'Create professional online presence for your shop',
      icon: GlobeAltIcon
    },
    {
      id: 'analytics',
      title: 'Performance Analytics',
      description: 'Track shop performance and identify growth opportunities',
      icon: ChartBarIcon
    }
  ],
  enterprise: [
    {
      id: 'multi_location',
      title: 'Multi-Location Management',
      description: 'Centralized control across all locations',
      icon: BuildingOffice2Icon
    },
    {
      id: 'analytics',
      title: 'Enterprise Analytics',
      description: 'Comprehensive performance insights across locations',
      icon: ChartBarIcon
    },
    {
      id: 'finances',
      title: 'Financial Oversight',
      description: 'Track revenue, costs, and profitability by location',
      icon: CurrencyDollarIcon
    },
    {
      id: 'team_management',
      title: 'Team Management',
      description: 'Manage staff across multiple locations',
      icon: UserGroupIcon
    },
    {
      id: 'standardization',
      title: 'Standardize Operations',
      description: 'Ensure consistent service quality across all locations',
      icon: SparklesIcon
    }
  ]
}

const tierLabels = {
  barber: 'Individual Barber',
  shop: 'Shop Owner', 
  enterprise: 'Enterprise Owner'
}

export default function GoalsSelector({ onComplete, initialData = {}, subscriptionTier = 'shop' }) {
  const [selectedGoals, setSelectedGoals] = useState(initialData.goals || [])
  const [businessSize, setBusinessSize] = useState(initialData.businessSize || '')
  
  const availableGoals = goalsByTier[subscriptionTier] || goalsByTier.shop
  const tierLabel = tierLabels[subscriptionTier] || 'Shop Owner'

  const handleGoalToggle = (goalId) => {
    setSelectedGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId)
      }
      if (prev.length < 3) { // Limit to 3 goals
        return [...prev, goalId]
      }
      return prev
    })
  }

  const handleContinue = () => {
    if (selectedGoals.length > 0) {
      onComplete({
        role: subscriptionTier === 'barber' ? 'individual_barber' : 
              subscriptionTier === 'shop' ? 'shop_owner' : 'enterprise_owner',
        goals: selectedGoals,
        businessSize: subscriptionTier === 'barber' ? '1' : businessSize
      })
    }
  }

  const isComplete = selectedGoals.length > 0 && (subscriptionTier === 'barber' || businessSize)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600 font-medium">
            {tierLabel} Plan Selected
          </span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          What are your main goals?
        </h3>
        <p className="text-gray-600">
          Select up to 3 goals to customize your experience for {tierLabel.toLowerCase()} needs
        </p>
      </div>

      {/* Goals Selection */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableGoals.map((goal) => {
            const Icon = goal.icon
            const isSelected = selectedGoals.includes(goal.id)
            return (
              <button
                key={goal.id}
                onClick={() => handleGoalToggle(goal.id)}
                disabled={!isSelected && selectedGoals.length >= 3}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-olive-500 bg-olive-50'
                    : selectedGoals.length >= 3
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-start">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                    isSelected ? 'bg-olive-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isSelected ? 'text-olive-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {goal.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {goal.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        
        {selectedGoals.length > 0 && (
          <div className="mt-4 p-3 bg-olive-50 rounded-lg">
            <p className="text-sm text-olive-700">
              <span className="font-medium">{selectedGoals.length}/3 goals selected:</span> {
                selectedGoals.map(goalId => 
                  availableGoals.find(g => g.id === goalId)?.title
                ).join(', ')
              }
            </p>
          </div>
        )}
      </div>

      {/* Business Size (for shop/enterprise owners) */}
      {subscriptionTier !== 'barber' && selectedGoals.length > 0 && (
        <div className="animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How many {subscriptionTier === 'enterprise' ? 'locations' : 'chairs'} do you have?
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {(subscriptionTier === 'enterprise' 
              ? ['2', '3-5', '6-10', '10+']
              : ['1', '2-5', '6-10', '10+']
            ).map((size) => (
              <button
                key={size}
                onClick={() => setBusinessSize(size)}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  businessSize === size
                    ? 'border-olive-500 bg-olive-50 text-olive-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!isComplete}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isComplete
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}