'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

/**
 * StripeModeBanner - Displays a warning banner when Stripe is in test mode
 * Shows confirmation when in live mode for production
 * Helps prevent accidental test mode deployment
 */
export default function StripeModeBanner() {
  const [stripeMode, setStripeMode] = useState(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isProduction, setIsProduction] = useState(false)

  useEffect(() => {
    // Check if we're in production
    const isProd = window.location.hostname === 'bookedbarber.com' || 
                   window.location.hostname === 'www.bookedbarber.com'
    setIsProduction(isProd)

    // Check Stripe mode from publishable key
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    if (!publishableKey) {
      setStripeMode('missing')
      return
    }

    if (publishableKey.startsWith('pk_live_')) {
      setStripeMode('live')
    } else if (publishableKey.startsWith('pk_test_')) {
      setStripeMode('test')
    } else {
      setStripeMode('invalid')
    }

    // Auto-dismiss success banner after 5 seconds
    if (stripeMode === 'live' && isProd) {
      setTimeout(() => setIsDismissed(true), 5000)
    }
  }, [stripeMode])

  // Don't show if dismissed or if everything is correct
  if (isDismissed) return null
  
  // Show nothing in development with test keys (expected behavior)
  if (!isProduction && stripeMode === 'test') return null
  
  // Show nothing in production with live keys after initial confirmation
  if (isProduction && stripeMode === 'live' && isDismissed) return null

  // Determine banner style and message
  const getBannerConfig = () => {
    if (stripeMode === 'missing') {
      return {
        type: 'error',
        title: 'Stripe Not Configured',
        message: 'Payment processing is not available. Stripe keys are missing.',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-red-600'
      }
    }

    if (stripeMode === 'invalid') {
      return {
        type: 'error',
        title: 'Invalid Stripe Configuration',
        message: 'Stripe keys appear to be invalid. Please check configuration.',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-red-600'
      }
    }

    if (isProduction && stripeMode === 'test') {
      return {
        type: 'warning',
        title: '⚠️ TEST MODE - Real Payments Disabled',
        message: 'This site is using Stripe TEST keys. Payments will not process real money. Switch to LIVE keys for production.',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-800',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-600',
        persistent: true // Don't allow dismissing this critical warning
      }
    }

    if (isProduction && stripeMode === 'live') {
      return {
        type: 'success',
        title: '✅ Live Payment Processing Active',
        message: 'Stripe is configured for live payments. Real transactions will be processed.',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        icon: CheckCircleIcon,
        iconColor: 'text-green-600'
      }
    }

    if (!isProduction && stripeMode === 'live') {
      return {
        type: 'warning',
        title: '⚠️ Live Keys in Development',
        message: 'Using LIVE Stripe keys in development. Be careful with test transactions!',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-400',
        textColor: 'text-orange-800',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-orange-600'
      }
    }

    return null
  }

  const config = getBannerConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <div className={`${config.bgColor} ${config.borderColor} border-b px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`h-5 w-5 ${config.iconColor} mr-3`} />
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className={`font-semibold ${config.textColor}`}>
              {config.title}
            </span>
            <span className={`text-sm ${config.textColor} opacity-90`}>
              {config.message}
            </span>
          </div>
        </div>
        
        {!config.persistent && (
          <button
            onClick={() => setIsDismissed(true)}
            className={`${config.textColor} hover:opacity-70 transition-opacity`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Developer info in small text */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`text-xs ${config.textColor} opacity-70 mt-2 max-w-7xl mx-auto`}>
          Mode: {stripeMode} | Domain: {window.location.hostname} | 
          Key: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}...
        </div>
      )}
    </div>
  )
}