'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

function SubscribeSuccessContent() {
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionDetails, setSubscriptionDetails] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { user } = useAuth()

  useEffect(() => {
    if (sessionId) {
      verifySubscription()
    } else {
      setError('No session ID found')
      setVerifying(false)
    }
  }, [sessionId])

  const verifySubscription = async () => {
    try {
      // Verify the subscription with our backend
      const response = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId: user?.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify subscription')
      }

      setSubscriptionDetails(data)
      setVerifying(false)

      // Redirect to dashboard after 5 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 5000)

    } catch (err) {
      console.error('Verification error:', err)
      setError(err.message || 'Failed to verify subscription')
      setVerifying(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Verifying your subscription...</h2>
          <p className="text-gray-600 mt-2">Please wait while we activate your account.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/subscribe')}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Try Again
            </button>
            <p className="text-sm text-gray-500 mt-4">
              If you continue to have issues, please contact support.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to BookedBarber!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your subscription has been activated successfully.
          </p>

          {/* Subscription Details */}
          {subscriptionDetails && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Subscription Details:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium text-gray-900">
                    {subscriptionDetails.planName || 'Professional'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing:</span>
                  <span className="font-medium text-gray-900">
                    {subscriptionDetails.billingPeriod || 'Monthly'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">
                    ${subscriptionDetails.amount || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next billing:</span>
                  <span className="font-medium text-gray-900">
                    {subscriptionDetails.nextBilling || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
            <ul className="text-left space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Complete your barbershop profile</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Add your services and pricing</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Set up your booking schedule</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Invite your team members</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Complete Setup
            </button>
          </div>

          {/* Auto-redirect notice */}
          <p className="text-xs text-gray-500 mt-6">
            You'll be redirected to your dashboard in a few seconds...
          </p>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense boundary
function SubscribeSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Loading subscription details...</h2>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={<SubscribeSuccessLoading />}>
      <SubscribeSuccessContent />
    </Suspense>
  )
}