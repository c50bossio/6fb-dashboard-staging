'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function StripeRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  useEffect(() => {
    // Check if we're in development and need to redirect to localhost
    const isProduction = window.location.hostname === 'bookedbarber.com' || 
                         window.location.hostname === 'www.bookedbarber.com'
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1'
    
    // Get the success and other params from URL
    const success = searchParams.get('success')
    const step = searchParams.get('step')
    const accountId = searchParams.get('account_id')
    
    // If we're on production (bookedbarber.com) after Stripe redirect
    if (isProduction) {
      setIsRedirecting(true)
      // In production, stay on production and continue onboarding
      router.push('/dashboard/settings?section=payments&success=true')
    } else if (isDevelopment) {
      // We're already on localhost, just redirect to the onboarding page
      router.push(`/dashboard/onboarding?step=financial&success=true`)
    }
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {isRedirecting ? 'Stripe Setup Complete!' : 'Processing Stripe Setup...'}
        </h1>
        <p className="text-gray-600 mb-4">
          {isRedirecting 
            ? 'Great! Your Stripe account is set up. Redirecting you to complete your setup...'
            : 'Please wait while we process your setup...'}
        </p>
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