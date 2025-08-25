'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

function OnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState('checking')
  const [accountDetails, setAccountDetails] = useState(null)
  const [error, setError] = useState(null)

  const accountId = searchParams.get('account')
  const onboardingStatus = searchParams.get('status')

  useEffect(() => {
    checkAccountStatus()
  }, [accountId])

  const checkAccountStatus = async () => {
    if (!accountId) {
      setStatus('error')
      setError('No account ID provided')
      return
    }

    try {
      const response = await fetch(`/api/stripe/connect/account-status?accountId=${accountId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check account status')
      }

      setAccountDetails(data)

      if (data.onboardingComplete) {
        setStatus('complete')
        // Update database with completion status
        await updateOnboardingStatus(true)
      } else if (onboardingStatus === 'refresh') {
        setStatus('refresh')
      } else {
        setStatus('incomplete')
      }
    } catch (error) {
      console.error('Error checking account status:', error)
      setStatus('error')
      setError(error.message)
    }
  }

  const updateOnboardingStatus = async (isComplete) => {
    try {
      const supabase = createClient()
      
      // Update the financial arrangement
      const { error } = await supabase
        .from('financial_arrangements')
        .update({
          barber_stripe_onboarded: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('barber_stripe_account_id', accountId)

      if (error) {
        console.error('Failed to update onboarding status:', error)
      }
    } catch (error) {
      console.error('Error updating database:', error)
    }
  }

  const handleRefreshOnboarding = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create onboarding link')
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url
    } catch (error) {
      console.error('Error refreshing onboarding:', error)
      setStatus('error')
      setError(error.message)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'checking':
      case 'loading':
        return (
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900">Checking Account Status</h3>
            <p className="mt-2 text-gray-600">Please wait while we verify your Stripe account setup...</p>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Account Setup Complete!</h3>
            <p className="mt-2 text-gray-600">
              Your Stripe account is fully configured and ready to receive payments.
            </p>
            {accountDetails && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Charges Enabled:</dt>
                    <dd className="font-medium">{accountDetails.chargesEnabled ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Payouts Enabled:</dt>
                    <dd className="font-medium">{accountDetails.payoutsEnabled ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Payout Schedule:</dt>
                    <dd className="font-medium">{accountDetails.payoutSchedule?.interval || 'Daily'}</dd>
                  </div>
                </dl>
              </div>
            )}
            <div className="mt-6">
              <Button onClick={() => router.push('/shop/settings/staff')}>
                Back to Staff Management
              </Button>
            </div>
          </div>
        )

      case 'incomplete':
        return (
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Account Setup Incomplete</h3>
            <p className="mt-2 text-gray-600">
              Your Stripe account setup is not complete. Additional information is required.
            </p>
            {accountDetails?.requirements?.currentlyDue?.length > 0 && (
              <div className="mt-4 bg-yellow-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Required Information</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {accountDetails.requirements.currentlyDue.map((req, index) => (
                    <li key={index}>{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6">
              <Button onClick={handleRefreshOnboarding}>
                Continue Setup
              </Button>
            </div>
          </div>
        )

      case 'refresh':
        return (
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Onboarding Session Expired</h3>
            <p className="mt-2 text-gray-600">
              Your onboarding session has expired. Click below to continue where you left off.
            </p>
            <div className="mt-6">
              <Button onClick={handleRefreshOnboarding}>
                Continue Setup
              </Button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Error</h3>
            <p className="mt-2 text-red-600">{error || 'An unexpected error occurred'}</p>
            <div className="mt-6 space-x-4">
              <Button variant="outline" onClick={() => router.push('/shop/settings/staff')}>
                Back to Staff
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  )
}

export default function StripeConnectOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}