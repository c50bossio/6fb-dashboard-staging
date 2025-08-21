'use client'

import React, { useState } from 'react'
import { 
  ChartBarIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  EyeIcon,
  SparklesIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  PlayIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

/**
 * Sample data for preview mode
 */
const SAMPLE_DATA = {
  healthScores: [
    { id: 1, name: 'Regular Customer', overall_score: 85, churn_risk: 'low' },
    { id: 2, name: 'VIP Client', overall_score: 92, churn_risk: 'low' },
    { id: 3, name: 'New Customer', overall_score: 65, churn_risk: 'medium' },
    { id: 4, name: 'At-Risk Customer', overall_score: 45, churn_risk: 'high' }
  ],
  clvData: [
    { id: 1, name: 'Top Spender', total_clv: 1250, predicted_clv: 1850 },
    { id: 2, name: 'Loyal Client', total_clv: 890, predicted_clv: 1200 },
    { id: 3, name: 'Growing Customer', total_clv: 340, predicted_clv: 680 }
  ],
  summaryMetrics: {
    averageHealthScore: 78,
    totalCLV: 4200,
    highRiskCustomers: 2,
    totalCustomers: 24
  }
}

/**
 * Gauge Chart Component for Preview
 */
const PreviewHealthScoreGauge = ({ score, label }) => {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (score) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="relative flex items-center justify-center opacity-75">
      <svg width={100} height={100} className="transform -rotate-90">
        <circle
          cx={50} cy={50} r={radius}
          stroke="#E5E7EB" strokeWidth="6" fill="transparent"
        />
        <circle
          cx={50} cy={50} r={radius}
          stroke={getColor(score)} strokeWidth="6" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-700">{score}</span>
        <span className="text-xs text-gray-500 text-center">{label}</span>
      </div>
    </div>
  )
}

/**
 * Preview Summary Metrics Component
 */
const PreviewSummaryMetrics = ({ showPreview }) => {
  const metrics = SAMPLE_DATA.summaryMetrics

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className={`${showPreview ? 'border-olive-200 bg-olive-50/30' : 'border-dashed border-gray-300'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Health Score</p>
              <p className={`text-3xl font-bold ${showPreview ? 'text-gray-900' : 'text-gray-400'}`}>
                {showPreview ? metrics.averageHealthScore : '--'}
              </p>
            </div>
            <HeartIcon className={`h-8 w-8 ${showPreview ? 'text-green-500' : 'text-gray-300'}`} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${showPreview ? 'border-olive-200 bg-olive-50/30' : 'border-dashed border-gray-300'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total CLV</p>
              <p className={`text-3xl font-bold ${showPreview ? 'text-gray-900' : 'text-gray-400'}`}>
                ${showPreview ? metrics.totalCLV.toFixed(0) : '--'}
              </p>
            </div>
            <CurrencyDollarIcon className={`h-8 w-8 ${showPreview ? 'text-blue-500' : 'text-gray-300'}`} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${showPreview ? 'border-olive-200 bg-olive-50/30' : 'border-dashed border-gray-300'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk Customers</p>
              <p className={`text-3xl font-bold ${showPreview ? 'text-red-600' : 'text-gray-400'}`}>
                {showPreview ? metrics.highRiskCustomers : '--'}
              </p>
            </div>
            <ExclamationTriangleIcon className={`h-8 w-8 ${showPreview ? 'text-red-500' : 'text-gray-300'}`} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${showPreview ? 'border-olive-200 bg-olive-50/30' : 'border-dashed border-gray-300'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className={`text-3xl font-bold ${showPreview ? 'text-gray-900' : 'text-gray-400'}`}>
                {showPreview ? metrics.totalCustomers : '--'}
              </p>
            </div>
            <UserGroupIcon className={`h-8 w-8 ${showPreview ? 'text-indigo-500' : 'text-gray-300'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Intelligence Dashboard Empty State Component
 * 
 * Provides contextual empty states for analytics dashboard with preview capabilities
 */
export default function IntelligenceDashboardEmptyState({
  type = 'no-customers', // 'no-customers', 'insufficient-data', 'new-barbershop'
  totalCustomers = 0,
  hasRecentActivity = false,
  onAddCustomer,
  onViewCustomers,
  className = ''
}) {
  const [showPreview, setShowPreview] = useState(false)

  const stateConfig = {
    'new-barbershop': {
      title: 'Welcome to Customer Intelligence!',
      subtitle: 'Your analytics dashboard awaits your first customers',
      description: 'Once you add customers and appointments, this dashboard will come alive with powerful insights about customer health, lifetime value, and churn risk.',
      primaryAction: {
        label: 'Add First Customer',
        onClick: onAddCustomer,
        icon: UserPlusIcon,
        variant: 'primary'
      },
      secondaryAction: {
        label: 'See Preview',
        onClick: () => setShowPreview(!showPreview),
        icon: showPreview ? EyeIcon : PlayIcon,
        variant: 'secondary'
      },
      estimatedTime: '2-3 customers',
      tips: [
        'Start with your regular customers first',
        'Add appointment history to see trends',
        'Customer health scores update automatically',
        'Analytics improve with more data points'
      ],
      gradient: 'from-olive-50 to-moss-50'
    },
    'no-customers': {
      title: 'Ready to unlock customer insights?',
      subtitle: 'Add customers to see powerful analytics',
      description: 'Your intelligence dashboard will display customer health scores, lifetime value predictions, and churn risk analysis once you have customer data.',
      primaryAction: {
        label: 'Add Customers',
        onClick: onAddCustomer,
        icon: UserPlusIcon,
        variant: 'primary'
      },
      secondaryAction: {
        label: showPreview ? 'Hide Preview' : 'Show What You\'ll Get',
        onClick: () => setShowPreview(!showPreview),
        icon: showPreview ? EyeIcon : PlayIcon,
        variant: 'secondary'
      },
      estimatedTime: '5+ customers for meaningful insights',
      tips: [
        'Import existing customer data if available',
        'Add contact preferences for better targeting',
        'Include service history for accurate predictions',
        'More appointments = better analytics'
      ],
      gradient: 'from-blue-50 to-indigo-50'
    },
    'insufficient-data': {
      title: 'Building your intelligence...',
      subtitle: `You have ${totalCustomers} customers - add more for better insights`,
      description: 'Customer intelligence improves with more data. Add appointments, update customer preferences, and track interactions for richer analytics.',
      primaryAction: {
        label: 'View Customers',
        onClick: onViewCustomers,
        icon: UserGroupIcon,
        variant: 'primary'
      },
      secondaryAction: {
        label: showPreview ? 'Hide Full Preview' : 'See Full Potential',
        onClick: () => setShowPreview(!showPreview),
        icon: showPreview ? EyeIcon : PlayIcon,
        variant: 'secondary'
      },
      estimatedTime: `Need ${Math.max(10 - totalCustomers, 0)} more customers for comprehensive analytics`,
      tips: [
        'Add appointment history for existing customers',
        'Update contact preferences and notes',
        'Track service preferences and patterns',
        'Regular appointments improve predictions'
      ],
      gradient: 'from-amber-50 to-orange-50'
    }
  }

  const config = stateConfig[type] || stateConfig['no-customers']

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Metrics Preview */}
      <PreviewSummaryMetrics showPreview={showPreview} />

      {/* Main Empty State */}
      <div className="text-center py-12">
        <div className="max-w-2xl mx-auto">
          {/* Background gradient */}
          <div className={`rounded-3xl bg-gradient-to-br ${config.gradient} p-8 mb-6 relative overflow-hidden`}>
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <ChartBarIcon className="h-16 w-16 text-gray-400" />
            </div>
            <div className="absolute bottom-4 left-4 opacity-10">
              <SparklesIcon className="h-12 w-12 text-gray-400" />
            </div>
            
            {/* Main illustration */}
            <div className="relative z-10">
              <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                <ChartBarIcon className="w-20 h-20 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              {config.title}
            </h3>
            <p className="text-xl text-gray-600 font-medium mb-4">
              {config.subtitle}
            </p>
            <p className="text-gray-700 leading-relaxed max-w-lg mx-auto text-lg">
              {config.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={config.primaryAction.onClick}
              className="px-8 py-4 bg-olive-600 text-white rounded-lg font-semibold text-lg hover:bg-olive-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <config.primaryAction.icon className="h-5 w-5" />
              {config.primaryAction.label}
            </button>
            
            <button
              onClick={config.secondaryAction.onClick}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-lg hover:border-olive-500 hover:text-olive-700 hover:bg-olive-50 transition-all duration-200 flex items-center gap-2"
            >
              <config.secondaryAction.icon className="h-5 w-5" />
              {config.secondaryAction.label}
            </button>
          </div>

          {/* Timeline indicator */}
          <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <RocketLaunchIcon className="h-5 w-5 text-olive-600" />
              <span className="font-medium">Expected insights timeline:</span>
              <span className="text-olive-700 font-semibold">{config.estimatedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      {showPreview && (
        <div className="border-2 border-olive-200 rounded-xl p-6 bg-gradient-to-r from-olive-50 to-moss-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-olive-600 rounded-full">
                <EyeIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Preview: What You'll See</h4>
                <p className="text-sm text-gray-600">This is sample data showing your future dashboard</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-olive-200 text-olive-800 rounded-full text-xs font-medium">
              SAMPLE DATA
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Scores Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Health Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {SAMPLE_DATA.healthScores.map((customer, index) => (
                    <div key={index} className="text-center">
                      <PreviewHealthScoreGauge 
                        score={customer.overall_score}
                        label={customer.name}
                      />
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          customer.churn_risk === 'low' ? 'bg-green-100 text-green-800' :
                          customer.churn_risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {customer.churn_risk.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CLV Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {SAMPLE_DATA.clvData.map((customer, index) => (
                    <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{customer.name}</span>
                        <span className="text-lg font-bold text-gray-700">${customer.total_clv}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Predicted CLV</span>
                        <span className="text-olive-600 font-semibold">${customer.predicted_clv}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-lg">
              <LightBulbIcon className="h-4 w-4 text-olive-600" />
              <span>Real data will appear here as you add customers and appointments</span>
            </div>
          </div>
        </div>
      )}

      {/* Tips section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center mb-4">
          <div className="p-2 bg-olive-100 rounded-full">
            <LightBulbIcon className="h-5 w-5 text-olive-600" />
          </div>
          <h4 className="ml-3 text-lg font-semibold text-gray-900">
            Getting Started Tips
          </h4>
        </div>
        
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          {config.tips.map((tip, index) => (
            <li 
              key={index} 
              className="flex items-start space-x-3 text-sm text-gray-700"
            >
              <div className="flex-shrink-0 w-1.5 h-1.5 bg-olive-500 rounded-full mt-2" />
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}