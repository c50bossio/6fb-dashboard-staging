'use client'

import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function PaymentSetupAlert() {
  const [showAlert, setShowAlert] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { user, profile } = useAuth()
  const supabase = createClient()
  
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
      
      try {
        // Check if they have a Stripe Connect account
        const { data: connectAccount } = await supabase
          .from('stripe_connected_accounts')
          .select('charges_enabled, payouts_enabled')
          .eq('user_id', user.id)
          .single()
        
        // Show alert if no account or not fully enabled
        if (!connectAccount || !connectAccount.charges_enabled || !connectAccount.payouts_enabled) {
          setShowAlert(true)
        }
      } catch (err) {
        // No account found - show alert
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
  
  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">Complete your payment setup</span> to start accepting credit card payments from customers.
          </p>
          <p className="mt-1 text-sm text-yellow-600">
            Get paid automatically with zero markup - you only pay Stripe's standard 2.9% + $0.30 per transaction.
          </p>
          <div className="mt-3 flex items-center space-x-3">
            <Link
              href="/dashboard/settings#payments"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Set Up Payments
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