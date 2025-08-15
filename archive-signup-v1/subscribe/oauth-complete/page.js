'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/SupabaseAuthProvider'

/**
 * OAuth Completion Handler
 * This page handles the secure validation of OAuth state and redirects to Stripe checkout
 * It's called by the auth callback when OAuth state parameter is present
 */
export default function OAuthCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('validating')
  const [error, setError] = useState('')

  useEffect(() => {
    handleOAuthCompletion()
  }, [])

  const handleOAuthCompletion = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('❌ OAuth completion timeout - redirecting to pricing')
        setError('OAuth completion timed out. Please try again.')
        setStatus('error')
        router.push('/subscribe?error=oauth_timeout')
      }, 30000) // 30 second timeout
      
      // Get plan data from URL parameters (new format)
      const planId = searchParams.get('planId')
      const billingPeriod = searchParams.get('billingPeriod')
      const state = searchParams.get('state')
      const oauthSuccess = searchParams.get('oauth_success')

      console.log('🔄 OAuth completion handler started:', { 
        planId,
        billingPeriod,
        hasState: !!state,
        oauthSuccess
      })
      
      // Clear timeout on successful start
      clearTimeout(timeoutId)

      let planData = null

      // First try direct URL parameters (new format - most reliable)
      if (planId && billingPeriod) {
        planData = {
          tierId: planId,  // Map planId to tierId for consistency with Stripe API
          billingPeriod: billingPeriod
        }
        console.log('✅ Plan data from URL parameters:', planData)
        console.log('🔍 Mapped planId → tierId for Stripe compatibility')
      }
      // Fall back to state parameter (legacy format)
      else if (state) {
        console.log('🔒 Decoding OAuth state parameter...')
        try {
          planData = JSON.parse(atob(state))
          console.log('📦 Decoded plan data from state:', planData)
        } catch (decodeError) {
          console.error('❌ State decode error:', decodeError)
          throw new Error('Invalid OAuth state format')
        }
      }
      else {
        console.error('❌ No plan data found in URL or state parameters')
        console.log('🔍 Available URL parameters:', {
          planId: searchParams.get('planId'),
          billingPeriod: searchParams.get('billingPeriod'), 
          state: searchParams.get('state'),
          oauth_success: searchParams.get('oauth_success')
        })
      }
      
      if (!planData || !planData.tierId || !planData.billingPeriod) {
        throw new Error('Missing or invalid plan data')
      }

      console.log('✅ Plan data validated:', {
        tierId: planData.tierId,
        billingPeriod: planData.billingPeriod,
        timestamp: planData.timestamp || 'N/A (direct URL params)'
      })

      // Only validate timestamp if it exists (from state parameter, not URL params)
      if (planData.timestamp) {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        if (planData.timestamp < fiveMinutesAgo) {
          throw new Error('OAuth session expired. Please try selecting a plan again.')
        }
        console.log('✅ Timestamp validation passed')
      } else {
        console.log('⏳ No timestamp validation needed (direct URL parameters)')
      }

      // Wait for auth to complete if still loading
      if (authLoading) {
        console.log('⏳ Waiting for authentication to complete...')
        setStatus('authenticating')
        
        // Add timeout for auth loading to prevent infinite waiting
        const authTimeout = setTimeout(() => {
          console.error('❌ Auth loading timeout')
          setError('Authentication is taking too long. Please try again.')
          setStatus('error')
        }, 10000) // 10 second timeout for auth
        
        // Store timeout to clear it when auth completes
        if (typeof window !== 'undefined') {
          window.authTimeoutId = authTimeout
        }
        return
      }
      
      // Clear auth timeout if it exists
      if (typeof window !== 'undefined' && window.authTimeoutId) {
        clearTimeout(window.authTimeoutId)
        window.authTimeoutId = null
      }

      if (!user) {
        throw new Error('Authentication failed. Please try again.')
      }

      console.log('👤 User authenticated:', user.email)
      setStatus('creating_checkout')

      // Create Stripe checkout session with the validated plan data
      const stripePayload = {
        tierId: planData.tierId,
        billingPeriod: planData.billingPeriod,
        userId: user.id,
        userEmail: user.email
      }
      
      console.log('💳 Creating Stripe checkout session...')
      console.log('📤 Stripe API payload:', stripePayload)
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stripePayload)
      })

      const data = await response.json()
      console.log('📥 Stripe API response:', {
        ok: response.ok,
        status: response.status,
        hasCheckoutUrl: !!data.checkoutUrl,
        error: data.error || 'None'
      })

      if (!response.ok) {
        console.error('❌ Stripe API Error Details:', data)
        throw new Error(data.error || 'Failed to create checkout session')
      }

      console.log('✅ Checkout session created, redirecting to Stripe...')
      
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        setStatus('redirecting')
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received from Stripe')
      }

    } catch (err) {
      console.error('❌ OAuth completion error:', err.message)
      setError(err.message)
      setStatus('error')
      
      // Redirect to subscribe page after a delay
      setTimeout(() => {
        router.push('/subscribe?error=oauth_completion_failed')
      }, 3000)
    }
  }

  // Re-run when auth loading changes
  useEffect(() => {
    if (!authLoading && status === 'authenticating') {
      handleOAuthCompletion()
    }
  }, [authLoading, status])

  const getStatusMessage = () => {
    switch (status) {
      case 'validating':
        return 'Validating your plan selection...'
      case 'authenticating':
        return 'Completing authentication...'
      case 'creating_checkout':
        return 'Creating your checkout session...'
      case 'redirecting':
        return 'Redirecting to secure checkout...'
      case 'error':
        return 'Something went wrong'
      default:
        return 'Processing...'
    }
  }

  const getStatusIcon = () => {
    if (status === 'error') {
      return '❌'
    }
    return '⏳'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="mb-6">
            <div className="text-6xl mb-4">{getStatusIcon()}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'error' ? 'Oops!' : 'Almost There!'}
            </h1>
            <p className="text-gray-600">
              {getStatusMessage()}
            </p>
          </div>

          {status !== 'error' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
              <p className="text-red-600 text-xs mt-2">
                Redirecting you back to the pricing page...
              </p>
            </div>
          )}

          {status === 'redirecting' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                🎉 Success! Taking you to secure checkout...
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔒 Secure payment processing by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}