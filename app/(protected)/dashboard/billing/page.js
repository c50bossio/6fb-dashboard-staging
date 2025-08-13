'use client'

import { 
  CreditCardIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function BillingPage() {
  const [billingData, setBillingData] = useState({
    currentMonth: {
      total: 124.50,
      aiUsage: 67.20,
      smsUsage: 42.30,
      emailUsage: 15.00,
      comparedToLastMonth: 12.5
    },
    usage: {
      ai: { tokens: 1120000, cost: 67.20 },
      sms: { messages: 2115, cost: 42.30 },
      email: { sent: 15000, cost: 15.00 }
    },
    paymentMethod: {
      last4: '4242',
      brand: 'Visa',
      expMonth: 12,
      expYear: 2025
    },
    subscription: {
      plan: 'Professional',
      status: 'active',
      nextBilling: '2024-02-01'
    }
  })

  const [timeRange, setTimeRange] = useState('30days')
  const [loading, setLoading] = useState(true)
  
  // Fetch billing data on mount
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const response = await fetch('/api/v1/billing/current', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setBillingData(data)
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBillingData()
  }, [])

  // Mock daily usage data for charts
  const dailyUsageData = [
    { date: 'Jan 1', ai: 15.20, sms: 8.40, email: 2.10 },
    { date: 'Jan 5', ai: 22.50, sms: 12.20, email: 3.50 },
    { date: 'Jan 10', ai: 18.30, sms: 15.60, email: 4.20 },
    { date: 'Jan 15', ai: 28.90, sms: 9.80, email: 2.80 },
    { date: 'Jan 20', ai: 19.40, sms: 11.50, email: 3.10 },
    { date: 'Jan 25', ai: 25.60, sms: 14.30, email: 4.60 },
    { date: 'Jan 30', ai: 32.10, sms: 16.20, email: 5.20 }
  ]

  // Usage breakdown for pie chart
  const usageBreakdown = [
    { name: 'AI Business Coach', value: billingData.usage.ai.cost, color: '#3B82F6' },
    { name: 'SMS Marketing', value: billingData.usage.sms.cost, color: '#C5A35B' },
    { name: 'Email Campaigns', value: billingData.usage.email.cost, color: '#10B981' }
  ]

  const handleDownloadInvoice = () => {
    // In production, this would generate and download a PDF invoice
    alert('Invoice download started...')
  }

  const handleUpdatePayment = () => {
    // In production, this would open Stripe checkout
    alert('Redirecting to payment update...')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Usage</h1>
          <p className="text-gray-600">Track your API usage and manage billing</p>
        </div>

        {/* Current Month Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Current Month Total</span>
              <CreditCardIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">${billingData.currentMonth.total}</span>
            </div>
            <div className="flex items-center mt-2">
              {billingData.currentMonth.comparedToLastMonth > 0 ? (
                <>
                  <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">+{billingData.currentMonth.comparedToLastMonth}%</span>
                </>
              ) : (
                <>
                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{billingData.currentMonth.comparedToLastMonth}%</span>
                </>
              )}
              <span className="text-sm text-gray-500 ml-1">vs last month</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">AI Usage</span>
              <div className="h-2 w-2 bg-olive-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">${billingData.usage.ai.cost}</span>
            </div>
            <span className="text-sm text-gray-500">{(billingData.usage.ai.tokens / 1000).toFixed(0)}K tokens</span>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">SMS Usage</span>
              <div className="h-2 w-2 bg-gold-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">${billingData.usage.sms.cost}</span>
            </div>
            <span className="text-sm text-gray-500">{billingData.usage.sms.messages.toLocaleString()} messages</span>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Email Usage</span>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">${billingData.usage.email.cost}</span>
            </div>
            <span className="text-sm text-gray-500">{billingData.usage.email.sent.toLocaleString()} emails</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Usage Trends */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Usage Trends</h3>
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="ai" stroke="#3B82F6" name="AI" strokeWidth={2} />
                  <Line type="monotone" dataKey="sms" stroke="#C5A35B" name="SMS" strokeWidth={2} />
                  <Line type="monotone" dataKey="email" stroke="#10B981" name="Email" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Usage */}
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Usage Breakdown</h3>
              
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">AI Business Coach</h4>
                      <p className="text-sm text-gray-600">GPT-4 & Claude API calls</p>
                    </div>
                    <span className="font-semibold text-gray-900">${billingData.usage.ai.cost}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{(billingData.usage.ai.tokens / 1000).toFixed(0)}K tokens × $0.06/1K = ${billingData.usage.ai.cost}</p>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">SMS Marketing</h4>
                      <p className="text-sm text-gray-600">Appointment reminders & campaigns</p>
                    </div>
                    <span className="font-semibold text-gray-900">${billingData.usage.sms.cost}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{billingData.usage.sms.messages} messages × $0.02/msg = ${billingData.usage.sms.cost}</p>
                  </div>
                </div>

                <div className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">Email Campaigns</h4>
                      <p className="text-sm text-gray-600">Marketing emails & newsletters</p>
                    </div>
                    <span className="font-semibold text-gray-900">${billingData.usage.email.cost}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{billingData.usage.email.sent.toLocaleString()} emails × $0.001/email = ${billingData.usage.email.cost}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total for January</span>
                  <span className="text-xl font-bold text-gray-900">${billingData.currentMonth.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Usage Distribution */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={usageBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {usageBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {usageBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{((item.value / billingData.currentMonth.total) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CreditCardIcon className="h-8 w-8 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {billingData.paymentMethod.brand} •••• {billingData.paymentMethod.last4}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires {billingData.paymentMethod.expMonth}/{billingData.paymentMethod.expYear}
                    </p>
                  </div>
                </div>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </div>
              <button 
                onClick={handleUpdatePayment}
                className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Update Payment Method
              </button>
            </div>

            {/* Subscription */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900">{billingData.subscription.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {billingData.subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next billing</span>
                  <span className="font-medium text-gray-900">{billingData.subscription.nextBilling}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleDownloadInvoice}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  View Billing History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}