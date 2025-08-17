'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function StripeRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Check if we're in development and need to redirect to localhost
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1'
    
    // Get the success and other params from URL
    const success = searchParams.get('success')
    const step = searchParams.get('step')
    const accountId = searchParams.get('account_id')
    
    if (isDevelopment) {
      // We're already on localhost, just redirect to the onboarding page
      router.push(`/dashboard/onboarding?step=${step || 'financial'}&success=${success || 'true'}`)
    } else {
      // We're on production (bookedbarber.com), redirect to localhost for development
      if (process.env.NODE_ENV === 'development') {
        // In development, redirect to localhost
        window.location.href = `http://localhost:9999/dashboard/onboarding?step=${step || 'financial'}&success=${success || 'true'}&stripe_redirect=true`
      } else {
        // In production, stay on production domain
        router.push(`/dashboard/onboarding?step=${step || 'financial'}&success=${success || 'true'}`)
      }
    }
  }, [router, searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Processing Stripe Setup...
        </h1>
        <p className="text-gray-600">
          Redirecting you back to complete your onboarding...
        </p>
      </div>
    </div>
  )
}