/**
 * Customer Comparison Component
 * 
 * Provides side-by-side customer comparison for analysis and insights
 * Useful for understanding customer patterns and making strategic decisions
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  ArrowsUpDownIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  PlusIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { customerDesignTokens } from './CustomerDesignSystem'
import { AnimatedContainer, CountUp, AnimatedProgressBar } from '../../utils/animations'
import { HoverCard, Tooltip } from './CustomerMicroInteractions'

/**
 * Customer comparison card
 */
function CustomerComparisonCard({ 
  customer, 
  onRemove, 
  onViewDetails,
  isAddNew = false,
  onAddCustomer,
  className = '' 
}) {
  if (isAddNew) {
    return (
      <div className={`
        border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center
        hover:border-olive-400 hover:bg-olive-50/50 transition-all duration-200 cursor-pointer
        ${className}
      `} onClick={onAddCustomer}>
        <PlusIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Add Customer</h3>
        <p className="text-sm text-gray-500 text-center">
          Click to add another customer for comparison
        </p>
      </div>
    )
  }

  if (!customer) return null

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip': return { bg: 'bg-gold-100', text: 'text-gold-800', border: 'border-gold-200' }
      case 'new': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
      case 'lapsed': return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' }
      case 'regular': return { bg: 'bg-olive-100', text: 'text-olive-800', border: 'border-olive-200' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
    }
  }

  const segmentColors = getSegmentColor(customer.segment)
  const daysSinceLastVisit = customer.lastVisit && customer.lastVisit !== 'Never' 
    ? Math.floor((Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-olive-100 to-moss-100 rounded-full flex items-center justify-center">
              <span className="text-olive-700 font-bold text-lg">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {customer.segment === 'vip' && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center">
                <StarSolidIcon className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name and segment */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
            {customer.segment && (
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                ${segmentColors.bg} ${segmentColors.text} ${segmentColors.border}
              `}>
                {customer.segment.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          <Tooltip content="View full profile">
            <button
              onClick={() => onViewDetails?.(customer)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <button
            onClick={() => onRemove?.(customer)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4 mb-6">
        {/* Total Visits */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">Total Visits</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            <CountUp end={customer.totalVisits || 0} duration={800} />
          </span>
        </div>

        {/* Total Spent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Total Spent</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            $<CountUp end={customer.totalSpent || 0} duration={800} />
          </span>
        </div>

        {/* Average per Visit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-gray-600">Avg per Visit</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            $<CountUp 
              end={customer.totalVisits > 0 ? Math.round(customer.totalSpent / customer.totalVisits) : 0} 
              duration={800} 
            />
          </span>
        </div>

        {/* Last Visit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-gray-600">Last Visit</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {customer.lastVisit === 'Never' ? 'Never' : new Date(customer.lastVisit).toLocaleDateString()}
            </div>
            {daysSinceLastVisit !== null && (
              <div className="text-xs text-gray-500">
                {daysSinceLastVisit} days ago
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-6">
        {customer.phone && (
          <div className="flex items-center space-x-2 text-sm">
            <PhoneIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 truncate">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center space-x-2 text-sm">
            <EnvelopeIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 truncate">{customer.email}</span>
          </div>
        )}
      </div>

      {/* Customer Score */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Customer Score</span>
          <span className="text-sm font-bold text-gray-900">
            {Math.round(calculateCustomerScore(customer))}/100
          </span>
        </div>
        <AnimatedProgressBar 
          progress={calculateCustomerScore(customer)} 
          duration={1000}
          color="olive"
        />
      </div>
    </div>
  )
}

/**
 * Calculate customer score based on various factors
 */
function calculateCustomerScore(customer) {
  let score = 0
  
  // Visit frequency (0-30 points)
  score += Math.min(customer.totalVisits * 3, 30)
  
  // Spending (0-25 points)
  score += Math.min(customer.totalSpent / 20, 25)
  
  // Recency (0-25 points)
  if (customer.lastVisit && customer.lastVisit !== 'Never') {
    const daysSinceLastVisit = Math.floor((Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLastVisit < 30) score += 25
    else if (daysSinceLastVisit < 60) score += 15
    else if (daysSinceLastVisit < 90) score += 10
    else score += 5
  }
  
  // Segment bonus (0-20 points)
  if (customer.segment === 'vip') score += 20
  else if (customer.segment === 'regular') score += 15
  else if (customer.segment === 'new') score += 10
  
  return Math.min(score, 100)
}

/**
 * Comparison insights component
 */
function ComparisonInsights({ customers, className = '' }) {
  if (customers.length < 2) return null

  const insights = []

  // Compare total spending
  const spendingValues = customers.map(c => c.totalSpent || 0)
  const maxSpending = Math.max(...spendingValues)
  const minSpending = Math.min(...spendingValues)
  const maxSpendingCustomer = customers[spendingValues.indexOf(maxSpending)]
  const minSpendingCustomer = customers[spendingValues.indexOf(minSpending)]

  if (maxSpending > minSpending) {
    insights.push({
      type: 'spending',
      icon: CurrencyDollarIcon,
      title: 'Spending Leader',
      description: `${maxSpendingCustomer.name} has spent ${((maxSpending / minSpending - 1) * 100).toFixed(0)}% more than ${minSpendingCustomer.name}`,
      trend: 'up'
    })
  }

  // Compare visit frequency
  const visitValues = customers.map(c => c.totalVisits || 0)
  const maxVisits = Math.max(...visitValues)
  const minVisits = Math.min(...visitValues)
  const maxVisitsCustomer = customers[visitValues.indexOf(maxVisits)]
  const minVisitsCustomer = customers[visitValues.indexOf(minVisits)]

  if (maxVisits > minVisits) {
    insights.push({
      type: 'visits',
      icon: CalendarIcon,
      title: 'Most Frequent Visitor',
      description: `${maxVisitsCustomer.name} has visited ${maxVisits - minVisits} more times than ${minVisitsCustomer.name}`,
      trend: 'up'
    })
  }

  // Compare customer scores
  const scores = customers.map(c => calculateCustomerScore(c))
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const maxScoreCustomer = customers[scores.indexOf(maxScore)]

  if (maxScore > minScore) {
    insights.push({
      type: 'score',
      icon: StarIcon,
      title: 'Top Performer',
      description: `${maxScoreCustomer.name} has the highest customer score (${Math.round(maxScore)}/100)`,
      trend: 'up'
    })
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <ChartBarIcon className="h-5 w-5 mr-2 text-olive-600" />
        Comparison Insights
      </h3>
      
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-olive-100 rounded-lg flex items-center justify-center">
                <insight.icon className="h-4 w-4 text-olive-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-gray-600">
                {insight.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              {insight.trend === 'up' && (
                <TrendingUpIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        ))}
        
        {insights.length === 0 && (
          <div className="text-center py-4">
            <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Add more customers to see comparison insights
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Customer selection modal
 */
function CustomerSelectionModal({ 
  isOpen, 
  onClose, 
  availableCustomers = [], 
  selectedCustomers = [],
  onSelectCustomer,
  className = '' 
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = availableCustomers.filter(customer => 
    !selectedCustomers.find(selected => selected.id === customer.id) &&
    (customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
     customer.phone.includes(searchQuery))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh]
        animate-in fade-in-0 zoom-in-95
        ${className}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Select Customer</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          />
        </div>

        {/* Customer list */}
        <div className="overflow-y-auto max-h-96">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <UserGroupIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => {
                    onSelectCustomer(customer)
                    onClose()
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {customer.email || customer.phone}
                    </p>
                  </div>
                  {customer.segment && (
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${customer.segment === 'vip' ? 'bg-gold-100 text-gold-800' :
                        customer.segment === 'new' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {customer.segment.toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main Customer Comparison Component
 */
export default function CustomerComparison({
  initialCustomers = [],
  availableCustomers = [],
  onViewCustomer,
  className = ''
}) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [showSelectionModal, setShowSelectionModal] = useState(false)

  const addCustomer = (customer) => {
    if (customers.length < 4 && !customers.find(c => c.id === customer.id)) {
      setCustomers([...customers, customer])
    }
  }

  const removeCustomer = (customerToRemove) => {
    setCustomers(customers.filter(c => c.id !== customerToRemove.id))
  }

  const maxCustomers = 4

  return (
    <AnimatedContainer animation="fadeIn" className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Comparison</h2>
            <p className="text-gray-600">Compare up to {maxCustomers} customers side by side</p>
          </div>
          <div className="text-sm text-gray-500">
            {customers.length}/{maxCustomers} customers
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {customers.map((customer, index) => (
            <CustomerComparisonCard
              key={customer.id}
              customer={customer}
              onRemove={removeCustomer}
              onViewDetails={onViewCustomer}
            />
          ))}
          
          {customers.length < maxCustomers && (
            <CustomerComparisonCard
              isAddNew
              onAddCustomer={() => setShowSelectionModal(true)}
            />
          )}
        </div>

        {/* Insights */}
        {customers.length >= 2 && (
          <ComparisonInsights customers={customers} />
        )}

        {/* Empty State */}
        {customers.length === 0 && (
          <div className="text-center py-12">
            <ArrowsUpDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start Comparing Customers
            </h3>
            <p className="text-gray-600 mb-6">
              Add customers to see side-by-side comparisons and insights
            </p>
            <button
              onClick={() => setShowSelectionModal(true)}
              className="bg-olive-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-olive-700 transition-colors"
            >
              Add First Customer
            </button>
          </div>
        )}
      </div>

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        availableCustomers={availableCustomers}
        selectedCustomers={customers}
        onSelectCustomer={addCustomer}
      />
    </AnimatedContainer>
  )
}