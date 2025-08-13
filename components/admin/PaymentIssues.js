'use client'

import { useState } from 'react'

export default function PaymentIssues({ issues, onResolve }) {
  const [resolving, setResolving] = useState(new Set())
  const [expandedIssue, setExpandedIssue] = useState(null)

  const handleResolve = async (userId) => {
    setResolving(new Set(resolving).add(userId))
    try {
      await onResolve(userId)
    } finally {
      const newResolving = new Set(resolving)
      newResolving.delete(userId)
      setResolving(newResolving)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const getTierPrice = (tier) => {
    const prices = {
      barber: 35,
      shop: 99,
      enterprise: 249
    }
    return prices[tier] || 0
  }

  const getPriorityLevel = (daysPastDue) => {
    if (daysPastDue <= 3) return { level: 'medium', color: 'yellow', label: 'Medium' }
    if (daysPastDue <= 7) return { level: 'high', color: 'red', label: 'High' }
    return { level: 'critical', color: 'purple', label: 'Critical' }
  }

  const getDaysPastDue = (updatedAt) => {
    const now = new Date()
    const updated = new Date(updatedAt)
    return Math.floor((now - updated) / (1000 * 60 * 60 * 24))
  }

  if (!issues || issues.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow border-l-4 border-red-500">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Payment Issues Alert
              </h3>
              <p className="text-sm text-red-700">
                {issues.length} customer{issues.length === 1 ? '' : 's'} with failed payments requiring attention
              </p>
            </div>
          </div>
          
          <div className="text-sm text-red-700">
            Potential lost revenue: {formatCurrency(
              issues.reduce((sum, issue) => sum + getTierPrice(issue.subscription_tier), 0)
            )}
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="divide-y divide-gray-200">
        {issues.map((issue) => {
          const daysPastDue = getDaysPastDue(issue.updated_at)
          const priority = getPriorityLevel(daysPastDue)
          const tierPrice = getTierPrice(issue.subscription_tier)
          const isExpanded = expandedIssue === issue.id
          const isResolving = resolving.has(issue.id)

          return (
            <div key={issue.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Customer Info */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full bg-${priority.color}-500`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {issue.name || 'No name'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${priority.color}-100 text-${priority.color}-800`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{issue.email}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span className="capitalize">{issue.subscription_tier} tier</span>
                      <span>{formatCurrency(tierPrice)}/month</span>
                      <span>{daysPastDue} days past due</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                  >
                    {isExpanded ? 'Less' : 'Details'}
                  </button>
                  
                  <button
                    onClick={() => handleResolve(issue.id)}
                    disabled={isResolving}
                    className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isResolving
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-olive-600 text-white hover:bg-olive-700 focus:ring-olive-500'
                    }`}
                  >
                    {isResolving ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Resolving...</span>
                      </div>
                    ) : (
                      'Resume Subscription'
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pl-7 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Subscription Status:</span>
                        <span className="ml-2 text-gray-900">{issue.subscription_status}</span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Last Updated:</span>
                        <span className="ml-2 text-gray-900">{formatDate(issue.updated_at)}</span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Monthly Amount:</span>
                        <span className="ml-2 text-gray-900">{formatCurrency(tierPrice)}</span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Customer Since:</span>
                        <span className="ml-2 text-gray-900">{formatDate(issue.created_at)}</span>
                      </div>

                      {issue.payment_method_brand && (
                        <div>
                          <span className="font-medium text-gray-700">Payment Method:</span>
                          <span className="ml-2 text-gray-900">
                            {issue.payment_method_brand} ****{issue.payment_method_last4}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium text-gray-700">Staff Count:</span>
                        <span className="ml-2 text-gray-900">
                          {issue.current_staff_count}/{issue.staff_limit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Usage Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Current Usage</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">SMS Credits</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-olive-500 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (issue.sms_credits_used / issue.sms_credits_included) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {issue.sms_credits_used || 0}/{issue.sms_credits_included || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Email Credits</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (issue.email_credits_used / issue.email_credits_included) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {issue.email_credits_used || 0}/{issue.email_credits_included || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">AI Tokens</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gold-500 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (issue.ai_tokens_used / issue.ai_tokens_included) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {issue.ai_tokens_used || 0}/{issue.ai_tokens_included || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  <div className="bg-olive-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-olive-900 mb-2">Suggested Actions</h4>
                    <ul className="text-sm text-olive-800 space-y-1">
                      <li>• Contact customer via email about payment failure</li>
                      <li>• Offer payment plan or temporary discount if needed</li>
                      <li>• Update payment method if card expired</li>
                      {daysPastDue > 7 && (
                        <li className="font-medium">• Consider temporary account suspension</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {issues.length} payment issue{issues.length === 1 ? '' : 's'}
          </p>
          
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500">
              Export Report
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Send Reminder Emails
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}