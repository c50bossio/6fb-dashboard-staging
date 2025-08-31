'use client'

import {
  CreditCardIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Script from 'next/script'
import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function BillingPage() {
  const [billingData, setBillingData] = useState(null)
  const [usageHistory, setUsageHistory] = useState([])
  const [timeRange, setTimeRange] = useState('30days')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [stripe, setStripe] = useState(null)
  const [elements, setElements] = useState(null)
  const [setupIntent, setSetupIntent] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [invoices, setInvoices] = useState([])
  
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch current billing data
        const billingResponse = await fetch('/api/v1/billing/current')
        
        if (!billingResponse.ok) {
          throw new Error(`Failed to fetch billing data: ${billingResponse.status}`)
        }
        
        const billingData = await billingResponse.json()

        // Fetch usage history for charts
        const usageResponse = await fetch('/api/v1/billing/usage?months=3')
        const usageData = usageResponse.ok ? await usageResponse.json() : { history: [] }

        // Transform API data to match UI expectations
        const transformedData = {
          currentMonth: {
            total: billingData.costs.total,
            aiUsage: billingData.usage.ai.cost,
            smsUsage: billingData.usage.sms.cost,
            emailUsage: billingData.usage.email.cost,
            comparedToLastMonth: 0 // Calculate if we have historical data
          },
          usage: {
            ai: { 
              tokens: billingData.usage.ai.tokens, 
              cost: billingData.usage.ai.cost 
            },
            sms: { 
              messages: billingData.usage.sms.messages, 
              cost: billingData.usage.sms.cost 
            },
            email: { 
              sent: billingData.usage.email.sent, 
              cost: billingData.usage.email.cost 
            }
          },
          paymentMethod: {
            last4: '••••', // TODO: Get from Stripe
            brand: 'Card',
            expMonth: 12,
            expYear: 2025
          },
          subscription: {
            plan: billingData.subscription.tier,
            status: billingData.subscription.status,
            nextBilling: billingData.subscription.nextBillingDate?.split('T')[0] || '2024-02-01'
          },
          alerts: billingData.alerts || []
        }

        // Calculate month-over-month comparison if we have history
        if (usageData.history && usageData.history.length > 1) {
          const currentTotal = billingData.costs.total
          const lastMonthTotal = usageData.history[usageData.history.length - 2]?.grandTotal || 0
          if (lastMonthTotal > 0) {
            transformedData.currentMonth.comparedToLastMonth = 
              ((currentTotal - lastMonthTotal) / lastMonthTotal * 100)
          }
        }

        setBillingData(transformedData)
        setUsageHistory(usageData.history || [])
        
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
        setError(error.message)
        
        // Fallback to basic structure to prevent UI crashes
        setBillingData({
          currentMonth: { total: 0, aiUsage: 0, smsUsage: 0, emailUsage: 0, comparedToLastMonth: 0 },
          usage: { ai: { tokens: 0, cost: 0 }, sms: { messages: 0, cost: 0 }, email: { sent: 0, cost: 0 } },
          paymentMethod: { last4: '••••', brand: 'Card', expMonth: 12, expYear: 2025 },
          subscription: { plan: 'Free', status: 'active', nextBilling: '2024-02-01' },
          alerts: []
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchBillingData()
  }, [])

  // Mount Stripe Elements when available
  useEffect(() => {
    if (elements && showPaymentForm) {
      const paymentElement = elements.create('payment')
      paymentElement.mount('#payment-element')
      
      return () => {
        paymentElement.destroy()
      }
    }
  }, [elements, showPaymentForm])

  // Transform historical data for charts
  const dailyUsageData = usageHistory.length > 0 ? 
    usageHistory.map((period) => ({
      date: new Date(period.periodDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ai: period.costs.ai || 0,
      sms: period.costs.sms || 0,
      email: period.costs.email || 0
    })).slice(-7) : // Show last 7 data points
    [
      { date: 'Loading...', ai: 0, sms: 0, email: 0 }
    ]

  const usageBreakdown = billingData ? [
    { name: 'AI Business Coach', value: billingData.usage.ai.cost, color: '#3B82F6' },
    { name: 'SMS Marketing', value: billingData.usage.sms.cost, color: '#C5A35B' },
    { name: 'Email Campaigns', value: billingData.usage.email.cost, color: '#10B981' }
  ] : []

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/v1/billing/invoices?months=3')
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      
      const data = await response.json()
      setInvoices(data.invoices || [])
      return data.invoices || []
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
  }

  const handleViewInvoice = async (invoice = null) => {
    try {
      let invoiceToShow = invoice

      if (!invoiceToShow) {
        // Fetch current month's invoice
        const fetchedInvoices = await fetchInvoices()
        if (fetchedInvoices.length > 0) {
          invoiceToShow = fetchedInvoices[0] // Most recent invoice
        }
      }

      if (invoiceToShow) {
        setCurrentInvoice(invoiceToShow)
        setShowInvoiceModal(true)
      } else {
        alert('No invoices available to view')
      }
    } catch (error) {
      console.error('Error viewing invoice:', error)
      alert('Failed to load invoice: ' + error.message)
    }
  }

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch('/api/v1/billing/invoices?months=1')
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      
      const data = await response.json()
      
      if (data.invoices && data.invoices.length > 0) {
        const invoice = data.invoices[0]
        
        // Create a more detailed invoice text
        const invoiceText = `
6FB AI AGENT SYSTEM - INVOICE

Invoice Number: ${invoice.invoiceNumber}
Invoice Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
Period: ${invoice.period}
Due Date: ${invoice.dueDate}
Status: ${invoice.status.toUpperCase()}

Bill To:
${billingData.subscription.plan} Plan Subscriber
${billingData.paymentMethod.brand} •••• ${billingData.paymentMethod.last4}

Usage Details:
${invoice.items.map(item => 
  `${item.description.padEnd(30)} ${item.quantity.toString().padStart(10)} x $${item.unitPrice.toFixed(4).padStart(8)} = $${item.total.toFixed(2).padStart(8)}`
).join('\n')}

                                        ────────────────────
Subtotal:                                        $${invoice.subtotal.toFixed(2).padStart(8)}
Total:                                           $${invoice.total.toFixed(2).padStart(8)}

Thank you for your business!
        `.trim()
        
        // Create and download the invoice
        const blob = new Blob([invoiceText], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `6FB_Invoice_${invoice.invoiceNumber}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('No invoices available for download')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Failed to download invoice: ' + error.message)
    }
  }

  // Initialize Stripe when the script loads
  const handleStripeLoad = async () => {
    if (window.Stripe && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder')) {
      try {
        const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        setStripe(stripeInstance)
        
      } catch (error) {
        console.warn('⚠️ Stripe initialization failed:', error.message)
        // Don't set stripe instance if initialization fails
      }
    } else {
      console.warn('⚠️ Stripe publishable key not configured properly')
    }
  }

  // Fetch payment methods from Stripe
  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/stripe/manage-payment-methods')
      const data = await response.json()
      
      // Check if Stripe is configured
      if (data.configured === false) {
        
        setPaymentMethods([])
        return
      }
      
      if (response.ok) {
        setPaymentMethods(data.paymentMethods || [])
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      setPaymentMethods([])
    }
  }

  // Initialize Stripe Elements for adding payment method
  const initializeStripeElements = async () => {
    try {
      // Check if Stripe is available and configured
      if (!stripe) {
        throw new Error('Stripe not available. Payment system may not be configured.')
      }

      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle specific configuration errors
        if (response.status === 503) {
          console.warn('⚠️ Stripe not configured - using demo mode')
          setError('Payment system not configured. Contact support to enable payments.')
          return
        }
        
        throw new Error(errorData.error || 'Failed to create setup intent')
      }
      
      const { client_secret } = await response.json()
      setSetupIntent(client_secret)
      
      if (stripe) {
        const elementsInstance = stripe.elements({
          clientSecret: client_secret
        })
        setElements(elementsInstance)
        
      }
    } catch (error) {
      console.error('Error initializing Stripe Elements:', error)
      setError('Unable to initialize payment form: ' + error.message)
    }
  }

  const handleUpdatePayment = async () => {
    // Check if Stripe is configured before proceeding
    if (!stripe) {
      setError('Payment system not available. Please contact support.')
      return
    }
    
    try {
      // Fetch existing payment methods first
      await fetchPaymentMethods()
      
      // Show payment management interface
      setShowPaymentForm(true)
      
      // Initialize Stripe Elements if not already done
      if (stripe && !elements) {
        await initializeStripeElements()
      }
    } catch (error) {
      console.error('Error in handleUpdatePayment:', error)
      setError('Unable to load payment methods. Please try again later.')
    }
  }

  const handleAddPaymentMethod = async (event) => {
    event.preventDefault()
    
    if (!stripe || !elements || !setupIntent) {
      alert('Payment system not ready. Please try again.')
      return
    }

    const { error, setupIntent: confirmedSetupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required'
    })

    if (error) {
      console.error('Payment method setup failed:', error)
      alert('Failed to add payment method: ' + error.message)
    } else {
      alert('Payment method added successfully!')
      setShowPaymentForm(false)
      await fetchPaymentMethods() // Refresh the list
      
      // Update billing data to show new payment method
      if (paymentMethods.length === 0) {
        // If this was the first payment method, refresh billing data
        window.location.reload()
      }
    }
  }

  const handleRemovePaymentMethod = async (paymentMethodId) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    try {
      const response = await fetch(`/api/stripe/manage-payment-methods?paymentMethodId=${paymentMethodId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Payment method removed successfully!')
        await fetchPaymentMethods() // Refresh the list
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove payment method')
      }
    } catch (error) {
      console.error('Error removing payment method:', error)
      alert('Failed to remove payment method: ' + error.message)
    }
  }

  const handleViewBillingHistory = () => {
    // Scroll to usage trends section or expand it
    document.querySelector('.usage-trends')?.scrollIntoView({ behavior: 'smooth' })
  }

  const getUsageLimit = (serviceType, plan) => {
    const limits = {
      'Free': {
        ai: 5000,      // 5,000 AI tokens
        sms: 500,      // 500 SMS messages
        email: 1000    // 1,000 emails
      },
      'Individual': {
        ai: 5000,      // Same as free
        sms: 500,      
        email: 1000    
      },
      'Professional': {
        ai: 20000,     // 20,000 AI tokens
        sms: 2000,     // 2,000 SMS messages
        email: 5000    // 5,000 emails
      },
      'Enterprise': {
        ai: 100000,    // 100,000 AI tokens
        sms: 10000,    // 10,000 SMS messages
        email: 25000   // 25,000 emails
      }
    }

    return limits[plan]?.[serviceType] || limits['Free'][serviceType]
  }

  const handleUpgrade = (targetPlan) => {
    // Show plan preview instead of immediate change
    setSelectedPlan(targetPlan)
    setShowPlanPreview(true)
  }

  const calculatePlanPreview = (targetPlan) => {
    if (!billingData || !targetPlan) return null

    const currentPlan = billingData.subscription.plan
    const planPrices = { Free: 0, Individual: 29, Professional: 49, Enterprise: 99 }
    
    const currentPrice = planPrices[currentPlan] || 0
    const newPrice = planPrices[targetPlan] || 0
    const difference = newPrice - currentPrice
    
    // Calculate prorated amount (assuming mid-month change)
    const daysLeftInMonth = 15 // Simplified for demo
    const proratedAmount = (difference * daysLeftInMonth) / 30
    
    return {
      currentPlan,
      targetPlan,
      currentPrice,
      newPrice,
      difference,
      proratedAmount: Math.max(0, proratedAmount),
      isUpgrade: difference > 0,
      isDowngrade: difference < 0,
      effectiveDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(), // Tomorrow
      nextBillingAmount: newPrice
    }
  }

  const handlePlanChange = async (planName) => {
    const currentPlan = billingData.subscription.plan
    
    if (planName === currentPlan) {
      return // Already on this plan
    }
    
    const confirmMessage = planName === 'Free' 
      ? `Are you sure you want to downgrade to the ${planName} plan? You'll lose access to premium features.`
      : `Are you sure you want to ${planName > currentPlan ? 'upgrade' : 'change'} to the ${planName} plan?`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      // For now, just update the subscription tier in the database
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
          plan: planName.toLowerCase(),
          currentPlan: currentPlan.toLowerCase()
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change subscription plan')
      }
      
      // Update local state
      setBillingData(prev => ({
        ...prev,
        subscription: {
          ...prev.subscription,
          plan: planName
        }
      }))
      
      alert(`Successfully changed to ${planName} plan!`)
      
    } catch (error) {
      console.error('Error changing plan:', error)
      alert('Failed to change plan: ' + error.message)
    }
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

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load billing data</p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder') && (
        <Script 
          src="https://js.stripe.com/v3/" 
          onLoad={handleStripeLoad}
          strategy="lazyOnload"
        />
      )}
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Usage</h1>
          <p className="text-gray-600">Track your API usage and manage billing</p>
        </div>

        {/* Enhanced Usage Monitoring */}
        {billingData && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Monitoring</h2>
            
            {/* Critical Alerts */}
            {billingData.alerts && billingData.alerts.length > 0 && (
              <div className="space-y-3 mb-6">
                {billingData.alerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    alert.severity === 'critical' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <ExclamationCircleIcon className={`h-5 w-5 mr-3 ${
                          alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <div>
                          <p className={`font-medium ${
                            alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {alert.type.toUpperCase()} Usage Alert ({alert.percentage.toFixed(1)}% of limit)
                          </p>
                          <p className={`text-sm ${
                            alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {alert.used.toLocaleString()} of {alert.limit.toLocaleString()} {
                              alert.type === 'ai' ? 'tokens' : 
                              alert.type === 'sms' ? 'SMS messages' : 'emails'
                            } used this month
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {alert.percentage >= 90 && (
                          <button
                            onClick={() => handleUpgrade(alert.type === 'ai' ? 'Professional' : 'Enterprise')}
                            className="px-3 py-1 bg-olive-600 text-white rounded text-xs font-medium hover:bg-olive-700"
                          >
                            Upgrade Plan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Usage Meters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  type: 'AI Tokens',
                  used: billingData.usage.ai.tokens,
                  limit: getUsageLimit('ai', billingData.subscription.plan),
                  unit: 'tokens',
                  color: 'olive',
                  cost: billingData.usage.ai.cost
                },
                {
                  type: 'SMS Messages',
                  used: billingData.usage.sms.messages,
                  limit: getUsageLimit('sms', billingData.subscription.plan),
                  unit: 'messages',
                  color: 'yellow',
                  cost: billingData.usage.sms.cost
                },
                {
                  type: 'Email Campaigns',
                  used: billingData.usage.email.sent,
                  limit: getUsageLimit('email', billingData.subscription.plan),
                  unit: 'emails',
                  color: 'green',
                  cost: billingData.usage.email.cost
                }
              ].map((meter, index) => {
                const percentage = Math.min((meter.used / meter.limit) * 100, 100)
                const isNearLimit = percentage >= 80
                const isOverLimit = percentage >= 100
                
                return (
                  <div key={index} className={`card min-w-0 ${isOverLimit ? 'border-red-300 bg-red-50' : isNearLimit ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">{meter.type}</h4>
                      <span className={`text-sm font-semibold flex-shrink-0 ${
                        isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        ${meter.cost.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex justify-between items-start text-xs sm:text-sm text-gray-600 mb-1">
                        <span className="truncate flex-1 mr-2">{meter.used.toLocaleString()} / {meter.limit.toLocaleString()} {meter.unit}</span>
                        <span className="flex-shrink-0 ml-auto">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOverLimit ? 'bg-red-500' : 
                            isNearLimit ? 'bg-yellow-500' : 
                            meter.color === 'olive' ? 'bg-olive-500' :
                            meter.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {isOverLimit && (
                      <div className="text-xs text-red-600 font-medium break-words">
                        ⚠️ Over limit - additional charges apply
                      </div>
                    )}
                    {isNearLimit && !isOverLimit && (
                      <div className="text-xs text-yellow-600 font-medium break-words">
                        ⚠️ Approaching limit ({(meter.limit - meter.used).toLocaleString()} {meter.unit} remaining)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
                  <ChartBarIcon className="h-4 w-4 text-red-500 mr-1" />
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
          <div className="lg:col-span-2 usage-trends">
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
                    <p>{(billingData.usage.ai.tokens / 1000).toFixed(0)}K tokens × $0.04/1K = ${billingData.usage.ai.cost}</p>
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
                    <p>{billingData.usage.sms.messages} messages × $0.01/msg = ${billingData.usage.sms.cost}</p>
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
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder') ? (
                <>
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
                </>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-8 w-8 text-blue-400 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900">Payment System Setup Required</p>
                      <p className="text-sm text-blue-700">
                        Payment processing is disabled in development mode. Contact support to enable payments.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-moss-100 text-moss-900">
                    {billingData.subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next billing</span>
                  <span className="font-medium text-gray-900">{billingData.subscription.nextBilling}</span>
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Management</h3>
              <div className="space-y-4">
                {/* Current Plan */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Current Plan</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-moss-100 text-moss-900">
                      {billingData.subscription.plan}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Next billing: {billingData.subscription.nextBilling}
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={handleUpdatePayment}
                      className="w-full px-4 py-2 bg-olive-600 text-white rounded-md text-sm font-medium hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                    >
                      Update Payment Method
                    </button>
                    <button 
                      onClick={handleDownloadInvoice}
                      className="w-full px-4 py-2 border border-olive-600 text-olive-600 rounded-md text-sm font-medium hover:bg-olive-50 focus:outline-none focus:ring-2 focus:ring-olive-500"
                    >
                      Download Latest Invoice
                    </button>
                  </div>
                </div>

                {/* Available Plans */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Change Plan</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Free', price: '$0', features: 'Full barbershop, Individual-level limits', recommended: false },
                      { name: 'Individual', price: '$29', features: 'Personal branding, 1 barber', recommended: billingData.subscription.plan === 'Free' },
                      { name: 'Professional', price: '$49', features: 'Team features, up to 15 barbers', recommended: billingData.subscription.plan === 'Individual' },
                      { name: 'Enterprise', price: '$99', features: 'Unlimited locations & barbers', recommended: false }
                    ].map((plan) => {
                      const isCurrent = billingData.subscription.plan === plan.name
                      const isUpgrade = !isCurrent && ['Free', 'Individual', 'Professional', 'Enterprise'].indexOf(plan.name) > ['Free', 'Individual', 'Professional', 'Enterprise'].indexOf(billingData.subscription.plan)
                      
                      return (
                        <div 
                          key={plan.name}
                          className={`p-3 border rounded-lg transition-colors relative ${
                            isCurrent
                              ? 'border-olive-600 bg-olive-50' 
                              : 'border-gray-200 hover:border-olive-300 cursor-pointer'
                          }`}
                          onClick={() => !isCurrent && handleUpgrade(plan.name)}
                        >
                          {plan.recommended && (
                            <span className="absolute -top-2 -right-2 bg-olive-600 text-white text-xs px-2 py-1 rounded-full">
                              Recommended
                            </span>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="font-medium text-gray-900">{plan.name}</p>
                                {isCurrent && (
                                  <span className="ml-2 text-xs bg-olive-100 text-olive-800 px-2 py-1 rounded-full">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{plan.features}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-gray-900">{plan.price}</span>
                              <p className="text-xs text-gray-500">/month</p>
                              {isUpgrade && (
                                <p className="text-xs text-olive-600 font-medium">Upgrade</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleViewInvoice()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-olive-600 text-white rounded-md text-sm font-medium hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  View Current Invoice
                </button>
                <button 
                  onClick={handleDownloadInvoice}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>
                <button 
                  onClick={handleViewBillingHistory}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  View Usage Trends
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Management Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Payment Methods</h3>
              
              {/* Existing Payment Methods */}
              {paymentMethods.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Your Payment Methods</h4>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <CreditCardIcon className="h-6 w-6 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {method.brand.toUpperCase()} •••• {method.last4}
                            </p>
                            <p className="text-sm text-gray-600">
                              Expires {method.expMonth}/{method.expYear}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePaymentMethod(method.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Payment Method Form */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-3">Add New Payment Method</h4>
                {stripe && elements ? (
                  <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                    <div id="payment-element">
                      {/* Stripe Elements will be mounted here */}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-olive-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                      >
                        Add Payment Method
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false)
                          setElements(null)
                          setSetupIntent(null)
                        }}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payment form...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Display Modal */}
        {showInvoiceModal && currentInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Invoice {currentInvoice.invoiceNumber}</h3>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  ✕
                </button>
              </div>
              
              {/* Invoice Header */}
              <div className="bg-gradient-to-r from-olive-600 to-olive-700 text-white p-6 rounded-lg mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">6FB AI Agent System</h2>
                    <p className="text-olive-100 mt-1">Professional Business Intelligence</p>
                  </div>
                  <div className="text-right">
                    <p className="text-olive-100">Invoice Date</p>
                    <p className="text-xl font-semibold">
                      {new Date(currentInvoice.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bill To:</h4>
                  <div className="text-gray-600">
                    <p>{billingData.subscription.plan} Plan Subscriber</p>
                    <p>Payment Method: {billingData.paymentMethod.brand} •••• {billingData.paymentMethod.last4}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Invoice Details:</h4>
                  <div className="text-gray-600">
                    <p><strong>Period:</strong> {currentInvoice.period}</p>
                    <p><strong>Due Date:</strong> {currentInvoice.dueDate}</p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        currentInvoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : currentInvoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {currentInvoice.status.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Usage Details</h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${item.unitPrice.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Total */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Subtotal:</span>
                      <span>${currentInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-semibold text-gray-900 border-t">
                      <span>Total:</span>
                      <span>${currentInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowInvoiceModal(false)
                    handleDownloadInvoice()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-olive-600 text-white rounded-md text-sm font-medium hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Change Preview Modal */}
        {showPlanPreview && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Change Preview</h3>
              
              {(() => {
                const preview = calculatePlanPreview(selectedPlan)
                if (!preview) return <p>Unable to calculate preview</p>

                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Current Plan:</span>
                        <span className="font-medium">{preview.currentPlan} (${preview.currentPrice}/month)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">New Plan:</span>
                        <span className="font-medium">{preview.targetPlan} (${preview.newPrice}/month)</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Billing Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Effective Date:</span>
                          <span>{preview.effectiveDate}</span>
                        </div>
                        {preview.isUpgrade && preview.proratedAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Prorated Charge Today:</span>
                            <span className="font-medium text-olive-600">+${preview.proratedAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-600">Next Monthly Billing:</span>
                          <span className="font-medium">${preview.nextBillingAmount}/month</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        {preview.isUpgrade 
                          ? `You'll be charged ${preview.proratedAmount > 0 ? `$${preview.proratedAmount.toFixed(2)} today for the remaining days, then ` : ''}$${preview.newPrice}/month starting ${preview.effectiveDate}.`
                          : `Your plan will change to ${preview.targetPlan} effective ${preview.effectiveDate}. Your next billing will be $${preview.newPrice}/month.`
                        }
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => {
                          setShowPlanPreview(false)
                          setSelectedPlan(null)
                          handlePlanChange(selectedPlan)
                        }}
                        className="flex-1 bg-olive-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                      >
                        {preview.isUpgrade ? 'Confirm Upgrade' : 'Confirm Change'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPlanPreview(false)
                          setSelectedPlan(null)
                        }}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  )
}