'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function StripeRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectMessage, setRedirectMessage] = useState('Processing Stripe Setup...')
  
  useEffect(() => {
    // Get the success and other params from URL
    const success = searchParams.get('success')
    const step = searchParams.get('step')
    const refresh = searchParams.get('refresh')
    
    console.log('🔄 Stripe redirect handler:', {
      success,
      step,
      hostname: window.location.hostname
    })
    
    setIsRedirecting(true)
    
    // Handle refresh case (user needs to complete more requirements)
    if (refresh === 'true') {
      setRedirectMessage('Additional information needed. Please complete the requirements...')
      setTimeout(() => {
        router.push('/shop/settings/payment-setup')
      }, 2000)
      return
    }
    
    // Handle successful completion
    if (success === 'true' || step === 'banking') {
      setRedirectMessage('Payment setup successful! Confirming your connection...')
      
      // Clear any session storage
      sessionStorage.removeItem('stripe_onboarding_flow')
      sessionStorage.removeItem('stripe_return_path')
      
      // Mark the financial step as complete in the API
      fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'financial',
          stepData: { 
            stripeConnected: true,
            completedAt: new Date().toISOString()
          }
        })
      }).then(() => {
        // Redirect back to payment setup page with success confirmation
        router.push('/shop/settings/payment-setup?completed=true&stripe_connected=true')
      }).catch(() => {
        // Even if save fails, still redirect to show success
        router.push('/shop/settings/payment-setup?completed=true&stripe_connected=true')
      })
    } else {
      // No success parameter - might be an error or incomplete setup
      setRedirectMessage('Setup incomplete. Returning to payment settings...')
      setTimeout(() => {
        router.push('/shop/settings/payment-setup')
      }, 2000)
    }
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olive-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {redirectMessage}
        </h1>
        <p className="text-gray-600 mb-4">
          Please wait a moment...
        </p>
        <div className="mt-6">
          <p className="text-sm text-gray-500">
            If you're not redirected automatically, 
            <button 
              onClick={() => router.push('/shop/settings/payment-setup')}
              className="text-olive-600 hover:text-olive-700 underline ml-1"
            >
              click here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function StripeRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <StripeRedirectContent />
    </Suspense>
  )
}