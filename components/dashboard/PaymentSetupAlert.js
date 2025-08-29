'use client'

import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import unifiedStripeManager from '@/lib/stripe/UnifiedStripeManager'

export default function PaymentSetupAlert() {
  const [showAlert, setShowAlert] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [setupStatus, setSetupStatus] = useState(null)
  const { user, profile } = useAuth()
  
  useEffect(() => {
    const checkPaymentSetup = async () => {
      if (!user || !profile) return
      
      // Only show for shop owners and enterprise owners
      if (!['SHOP_OWNER', 'ENTERPRISE_OWNER'].includes(profile.role)) {
        return
      }
      
      // Check if already dismissed
      const dismissedKey = `payment_setup_alert_dismissed_${user.id}`
      if (localStorage.getItem(dismissedKey) === 'true') {
        setDismissed(true)
        return
      }
      
      // Determine barbershop ID
      const shopId = profile.shop_id || profile.barbershop_id
      if (!shopId) return
      
      try {
        // Use UnifiedStripeManager to check setup status
        const status = await unifiedStripeManager.getUnifiedStatus(shopId)
        setSetupStatus(status)
        
        // Show alert if setup is not complete
        if (status.overall_status !== 'completed') {
          setShowAlert(true)
        }
      } catch (err) {
        console.error('Error checking payment setup:', err)
        // Show alert on error to ensure users aren't blocked
        setShowAlert(true)
      }
    }
    
    checkPaymentSetup()
  }, [user, profile])
  
  const handleDismiss = () => {
    setShowAlert(false)
    setDismissed(true)
    if (user) {
      localStorage.setItem(`payment_setup_alert_dismissed_${user.id}`, 'true')
    }
  }
  
  if (!showAlert || dismissed) return null
  
  // Get contextual message based on setup status
  const getAlertMessage = () => {
    if (!setupStatus) {
      return {
        title: 'Complete your payment setup',
        description: 'Set up payments to start accepting credit card payments from customers.',
        progress: null
      }
    }

    const progress = setupStatus.setup_progress?.overall || 0
    const nextStep = setupStatus.next_steps?.[0] || 'Complete payment setup'

    return {
      title: progress > 0 ? `Payment setup ${progress}% complete` : 'Complete your payment setup',
      description: nextStep,
      progress: progress
    }
  }

  const alertMessage = getAlertMessage()

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">{alertMessage.title}</span>
          </p>
          <p className="mt-1 text-sm text-yellow-600">
            {alertMessage.description}
          </p>
          {alertMessage.progress && alertMessage.progress > 0 && (
            <div className="mt-2">
              <div className="flex items-center">
                <div className="flex-1 bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${alertMessage.progress}%` }}
                  />
                </div>
                <span className="ml-2 text-xs text-yellow-600">{alertMessage.progress}%</span>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-yellow-600">
            Get paid automatically with zero markup - you only pay Stripe's standard 2.9% + $0.30 per transaction.
          </p>
          <div className="mt-3 flex items-center space-x-3">
            <Link
              href="/dashboard/settings#payments"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {setupStatus?.overall_status === 'not_started' ? 'Set Up Payments' : 'Continue Setup'}
            </Link>
            <button
              onClick={handleDismiss}
              className="text-xs text-yellow-600 hover:text-yellow-500"
            >
              Remind me later
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={handleDismiss}
              className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}