'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarIcon,
  SparklesIcon,
  TrophyIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

const businessModels = [
  {
    id: 'traditional',
    title: 'Traditional Barbershop',
    description: 'Chair rental or commission-based model with walk-ins and appointments',
    icon: BuildingStorefrontIcon,
    pros: ['Steady income', 'Community presence', 'Flexible scheduling'],
    cons: ['Higher overhead', 'Staff management'],
    bestFor: 'Established areas with foot traffic'
  },
  {
    id: 'modern',
    title: 'Modern Appointment-Only',
    description: 'Premium service with online booking and no walk-ins',
    icon: CalendarIcon,
    pros: ['Predictable schedule', 'Higher prices', 'Better work-life balance'],
    cons: ['Requires marketing', 'Building initial clientele'],
    bestFor: 'Urban professionals and busy clients'
  },
  {
    id: 'hybrid',
    title: 'Hybrid Model',
    description: 'Combination of appointments and walk-ins with dynamic pricing',
    icon: SparklesIcon,
    pros: ['Maximum flexibility', 'Diverse revenue', 'Broader appeal'],
    cons: ['Complex management', 'Scheduling challenges'],
    bestFor: 'Growing businesses wanting flexibility'
  },
  {
    id: 'mobile',
    title: 'Mobile/On-Demand',
    description: 'Travel to clients or partner with businesses',
    icon: ArrowTrendingUpIcon,
    pros: ['Low overhead', 'Premium pricing', 'Unique service'],
    cons: ['Travel time', 'Equipment transport'],
    bestFor: 'Busy professionals and special events'
  }
]

const pricingStrategies = [
  {
    id: 'competitive',
    title: 'Competitive Pricing',
    description: 'Match local market rates',
    formula: 'Market Average ± 10%',
    example: 'Haircut: $30-35'
  },
  {
    id: 'premium',
    title: 'Premium Pricing',
    description: 'Above market for quality service',
    formula: 'Market Average + 25-50%',
    example: 'Haircut: $45-60'
  },
  {
    id: 'value',
    title: 'Value Pricing',
    description: 'Below market to build clientele',
    formula: 'Market Average - 15-25%',
    example: 'Haircut: $20-25'
  },
  {
    id: 'dynamic',
    title: 'Dynamic Pricing',
    description: 'Varies by time and demand',
    formula: 'Base + Demand Factor',
    example: 'Weekday: $25, Weekend: $35'
  }
]

const growthGoals = [
  { id: 'clients', title: 'Build Client Base', target: '100 regular clients in 6 months', icon: UsersIcon },
  { id: 'revenue', title: 'Revenue Target', target: '$10K monthly revenue by month 3', icon: CurrencyDollarIcon },
  { id: 'reputation', title: 'Online Reputation', target: '50+ 5-star reviews in 3 months', icon: TrophyIcon },
  { id: 'expansion', title: 'Team Growth', target: 'Add 2 barbers by end of year', icon: ArrowTrendingUpIcon }
]

const milestones = [
  { month: 1, title: 'Launch & Setup', tasks: ['Soft opening', 'First 10 customers', 'Social media setup'] },
  { month: 3, title: 'Stability', tasks: ['50+ regular clients', 'Break-even point', 'First marketing campaign'] },
  { month: 6, title: 'Growth', tasks: ['100+ clients', 'Profitable operations', 'Consider expansion'] },
  { month: 12, title: 'Scale', tasks: ['Full capacity', 'Team building', 'Second location planning'] }
]

export default function BusinessPlanningSetup({ onComplete, initialData = {} }) {
  const [selectedModel, setSelectedModel] = useState(initialData.businessModel || null)
  const [selectedPricing, setSelectedPricing] = useState(initialData.pricingStrategy || null)
  const [selectedGoals, setSelectedGoals] = useState(initialData.goals || [])
  const [customGoal, setCustomGoal] = useState('')
  const [showCustomGoalInput, setShowCustomGoalInput] = useState(false)
  const [financialProjections, setFinancialProjections] = useState(initialData.projections || {
    monthlyRent: 2000,
    monthlyExpenses: 1000,
    averageTicket: 35,
    dailyClients: 10,
    workingDays: 25
  })
  const [marketResearch, setMarketResearch] = useState(initialData.marketResearch || {
    competitorCount: '',
    averagePrice: '',
    targetDemographic: '',
    uniqueValue: ''
  })
  const [activeTab, setActiveTab] = useState('model')
  const [showProjections, setShowProjections] = useState(false)

  // Calculate financial projections
  const calculateProjections = () => {
    const { monthlyRent, monthlyExpenses, averageTicket, dailyClients, workingDays } = financialProjections
    const monthlyRevenue = averageTicket * dailyClients * workingDays
    const monthlyProfit = monthlyRevenue - (monthlyRent + monthlyExpenses)
    const breakEvenClients = Math.ceil((monthlyRent + monthlyExpenses) / averageTicket)
    
    return {
      monthlyRevenue,
      monthlyProfit,
      profitMargin: ((monthlyProfit / monthlyRevenue) * 100).toFixed(1),
      breakEvenClients,
      isViable: monthlyProfit > 0
    }
  }

  const projections = calculateProjections()

  const handleGoalToggle = (goalId) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalId))
    } else {
      setSelectedGoals([...selectedGoals, goalId])
    }
  }

  const handleAddCustomGoal = () => {
    if (customGoal.trim()) {
      const newGoal = {
        id: `custom_${Date.now()}`,
        title: customGoal,
        custom: true
      }
      setSelectedGoals([...selectedGoals, newGoal])
      setCustomGoal('')
      setShowCustomGoalInput(false)
    }
  }

  const handleComplete = () => {
    const planData = {
      businessModel: selectedModel,
      pricingStrategy: selectedPricing,
      goals: selectedGoals,
      projections: financialProjections,
      marketResearch,
      calculatedProjections: projections,
      milestones
    }
    onComplete(planData)
  }

  const isComplete = selectedModel && selectedPricing && selectedGoals.length > 0

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'model', label: 'Business Model', icon: BuildingStorefrontIcon },
            { id: 'pricing', label: 'Pricing Strategy', icon: CurrencyDollarIcon },
            { id: 'goals', label: 'Growth Goals', icon: TrophyIcon },
            { id: 'projections', label: 'Financial Planning', icon: ChartBarIcon }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-olive-500 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Business Model Selection */}
      {activeTab === 'model' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Choose Your Business Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessModels.map((model) => {
              const Icon = model.icon
              const isSelected = selectedModel === model.id
              return (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected
                      ? 'border-olive-500 bg-olive-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start">
                    <Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${isSelected ? 'text-olive-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{model.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-start">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-gray-600">
                            {model.pros.join(', ')}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-1 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-gray-600">
                            {model.cons.join(', ')}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <InformationCircleIcon className="w-4 h-4 text-blue-500 mr-1 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-gray-600">
                            Best for: {model.bestFor}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Market Research */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-500" />
              Quick Market Research
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="How many competitors nearby?"
                value={marketResearch.competitorCount}
                onChange={(e) => setMarketResearch({...marketResearch, competitorCount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Average haircut price in area?"
                value={marketResearch.averagePrice}
                onChange={(e) => setMarketResearch({...marketResearch, averagePrice: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Target demographic (e.g., young professionals)"
                value={marketResearch.targetDemographic}
                onChange={(e) => setMarketResearch({...marketResearch, targetDemographic: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Your unique value proposition"
                value={marketResearch.uniqueValue}
                onChange={(e) => setMarketResearch({...marketResearch, uniqueValue: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pricing Strategy */}
      {activeTab === 'pricing' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Set Your Pricing Strategy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingStrategies.map((strategy) => {
              const isSelected = selectedPricing === strategy.id
              return (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedPricing(strategy.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected
                      ? 'border-olive-500 bg-olive-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <h4 className="font-medium text-gray-900">{strategy.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-gray-500">
                      Formula: <span className="font-mono">{strategy.formula}</span>
                    </div>
                    <div className="text-xs text-olive-600 font-medium">
                      Example: {strategy.example}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pricing Calculator */}
          {marketResearch.averagePrice && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Recommended Pricing Based on Your Market</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Competitive:</span>
                  <div className="font-semibold text-blue-900">${marketResearch.averagePrice}</div>
                </div>
                <div>
                  <span className="text-blue-700">Premium:</span>
                  <div className="font-semibold text-blue-900">${Math.round(marketResearch.averagePrice * 1.35)}</div>
                </div>
                <div>
                  <span className="text-blue-700">Value:</span>
                  <div className="font-semibold text-blue-900">${Math.round(marketResearch.averagePrice * 0.8)}</div>
                </div>
                <div>
                  <span className="text-blue-700">Peak Hours:</span>
                  <div className="font-semibold text-blue-900">${Math.round(marketResearch.averagePrice * 1.2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Growth Goals */}
      {activeTab === 'goals' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Set Your Growth Goals
          </h3>
          
          {/* Pre-defined Goals */}
          <div className="space-y-3">
            {growthGoals.map((goal) => {
              const Icon = goal.icon
              const isSelected = selectedGoals.some(g => 
                typeof g === 'string' ? g === goal.id : g.id === goal.id
              )
              return (
                <button
                  key={goal.id}
                  onClick={() => handleGoalToggle(goal.id)}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all flex items-center
                    ${isSelected
                      ? 'border-olive-500 bg-olive-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mr-3 ${isSelected ? 'text-olive-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{goal.title}</h4>
                    <p className="text-sm text-gray-600">{goal.target}</p>
                  </div>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${isSelected ? 'border-olive-500 bg-olive-500' : 'border-gray-300'}
                  `}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Custom Goals */}
          <div className="mt-4">
            {selectedGoals.filter(g => typeof g === 'object' && g.custom).map((goal) => (
              <div key={goal.id} className="p-3 bg-gray-50 rounded-lg mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-700">{goal.title}</span>
                <button
                  onClick={() => setSelectedGoals(selectedGoals.filter(g => g.id !== goal.id))}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            {!showCustomGoalInput ? (
              <button
                onClick={() => setShowCustomGoalInput(true)}
                className="text-olive-600 hover:text-olive-700 font-medium text-sm"
              >
                + Add custom goal
              </button>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter your custom goal"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={handleAddCustomGoal}
                  className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowCustomGoalInput(false)
                    setCustomGoal('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Milestone Timeline */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Your Success Timeline</h4>
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div key={milestone.month} className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-olive-700">{milestone.month}m</span>
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="w-px h-16 bg-gray-300 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h5 className="font-medium text-gray-900">{milestone.title}</h5>
                    <ul className="mt-1 space-y-1">
                      {milestone.tasks.map((task, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Projections */}
      {activeTab === 'projections' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Planning & Projections
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Fields */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Monthly Expenses</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Rent/Lease</label>
                <input
                  type="number"
                  value={financialProjections.monthlyRent}
                  onChange={(e) => setFinancialProjections({...financialProjections, monthlyRent: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Other Expenses (utilities, supplies, etc.)</label>
                <input
                  type="number"
                  value={financialProjections.monthlyExpenses}
                  onChange={(e) => setFinancialProjections({...financialProjections, monthlyExpenses: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Revenue Projections</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Average Service Price</label>
                <input
                  type="number"
                  value={financialProjections.averageTicket}
                  onChange={(e) => setFinancialProjections({...financialProjections, averageTicket: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Clients Per Day</label>
                <input
                  type="number"
                  value={financialProjections.dailyClients}
                  onChange={(e) => setFinancialProjections({...financialProjections, dailyClients: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Working Days Per Month</label>
                <input
                  type="number"
                  value={financialProjections.workingDays}
                  onChange={(e) => setFinancialProjections({...financialProjections, workingDays: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Projection Results */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Monthly Projections</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Revenue</div>
                <div className="text-xl font-semibold text-gray-900">
                  ${projections.monthlyRevenue.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Profit</div>
                <div className={`text-xl font-semibold ${projections.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${projections.monthlyProfit.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Margin</div>
                <div className="text-xl font-semibold text-gray-900">
                  {projections.profitMargin}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Break-even</div>
                <div className="text-xl font-semibold text-gray-900">
                  {projections.breakEvenClients} clients
                </div>
              </div>
            </div>
            
            {/* Viability Indicator */}
            <div className={`mt-4 p-3 rounded-lg ${projections.isViable ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="flex items-center">
                {projections.isViable ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Your business plan looks viable!</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-red-800 font-medium">
                      Consider adjusting your pricing or reducing expenses
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Growth Scenarios */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">3 Months</h5>
              <div className="text-sm text-gray-600">
                <div>Revenue: ${(projections.monthlyRevenue * 3).toLocaleString()}</div>
                <div>Profit: ${(projections.monthlyProfit * 3).toLocaleString()}</div>
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">6 Months</h5>
              <div className="text-sm text-gray-600">
                <div>Revenue: ${(projections.monthlyRevenue * 6).toLocaleString()}</div>
                <div>Profit: ${(projections.monthlyProfit * 6).toLocaleString()}</div>
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">1 Year</h5>
              <div className="text-sm text-gray-600">
                <div>Revenue: ${(projections.monthlyRevenue * 12).toLocaleString()}</div>
                <div>Profit: ${(projections.monthlyProfit * 12).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4 text-sm">
          <div className={`flex items-center ${selectedModel ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircleIcon className="w-5 h-5 mr-1" />
            Business Model
          </div>
          <div className={`flex items-center ${selectedPricing ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircleIcon className="w-5 h-5 mr-1" />
            Pricing Strategy
          </div>
          <div className={`flex items-center ${selectedGoals.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircleIcon className="w-5 h-5 mr-1" />
            Goals ({selectedGoals.length})
          </div>
        </div>
        
        <button
          onClick={handleComplete}
          disabled={!isComplete}
          className={`
            px-6 py-2 rounded-md font-medium transition-colors
            ${isComplete
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Complete Business Plan
        </button>
      </div>
    </div>
  )
}