'use client'

import {
  UserIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  SparklesIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const roles = [
  {
    id: 'individual',
    title: 'Individual Barber',
    description: 'I work independently or rent a chair',
    icon: UserIcon,
    features: [
      'Personal booking page',
      'Custom branding',
      'Service management',
      'Client database'
    ],
    color: 'blue'
  },
  {
    id: 'shop_owner',
    title: 'Shop Owner',
    description: 'I own a barbershop with staff',
    icon: BuildingOfficeIcon,
    features: [
      'Multi-barber management',
      'Commission tracking',
      'Staff scheduling',
      'Financial reports'
    ],
    color: 'purple'
  },
  {
    id: 'enterprise',
    title: 'Enterprise Owner',
    description: 'I manage multiple locations',
    icon: BuildingOffice2Icon,
    features: [
      'Multi-location dashboard',
      'Franchise management',
      'Cross-location analytics',
      'Centralized control'
    ],
    color: 'green'
  }
]

const goals = [
  {
    id: 'bookings',
    title: 'Get More Bookings',
    description: 'Increase online appointments and reduce no-shows',
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
    title: 'Build Online Presence',
    description: 'Create a professional web presence and grow clientele',
    icon: GlobeAltIcon
  },
  {
    id: 'automate',
    title: 'Automate Operations',
    description: 'Save time with automated reminders and workflows',
    icon: SparklesIcon
  }
]

export default function RoleSelector({ onComplete, initialData = {} }) {
  const [selectedRole, setSelectedRole] = useState(initialData.role || null)
  const [selectedGoals, setSelectedGoals] = useState(initialData.goals || [])
  const [businessSize, setBusinessSize] = useState(initialData.businessSize || '')

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
    if (selectedRole && selectedGoals.length > 0) {
      onComplete({
        role: selectedRole,
        goals: selectedGoals,
        businessSize
      })
    }
  }

  const isComplete = selectedRole && selectedGoals.length > 0

  return (
    <div className="space-y-8">
      {/* Role Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What best describes you?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? `border-${role.color}-500 bg-${role.color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div className={`absolute top-4 right-4 w-6 h-6 bg-${role.color}-500 rounded-full flex items-center justify-center`}>
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
                <Icon className={`w-8 h-8 mb-3 ${isSelected ? `text-${role.color}-600` : 'text-gray-600'}`} />
                <h4 className="font-semibold text-gray-900 mb-1">{role.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                <ul className="space-y-1">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-500 flex items-center">
                      <CheckIcon className="w-3 h-3 mr-1.5 text-gray-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* Goals Selection */}
      {selectedRole && (
        <div className="animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            What are your main goals?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select up to 3 goals (we'll customize your experience based on these)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((goal) => {
              const Icon = goal.icon
              const isSelected = selectedGoals.includes(goal.id)
              return (
                <button
                  key={goal.id}
                  onClick={() => handleGoalToggle(goal.id)}
                  disabled={!isSelected && selectedGoals.length >= 3}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-olive-500 bg-olive-50'
                      : selectedGoals.length >= 3
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start">
                    <Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${
                      isSelected ? 'text-olive-600' : 'text-gray-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">
                        {goal.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Business Size (for shop/enterprise owners) */}
      {selectedRole && selectedRole !== 'individual' && selectedGoals.length > 0 && (
        <div className="animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How many {selectedRole === 'enterprise' ? 'locations' : 'chairs'} do you have?
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {['1', '2-5', '6-10', '10+'].map((size) => (
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
          disabled={!isComplete || (selectedRole !== 'individual' && !businessSize)}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isComplete && (selectedRole === 'individual' || businessSize)
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