'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'

/**
 * Client-side OAuth callback handler
 * This handles the OAuth callback on the client side where PKCE code verifier is accessible
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Check for plan data immediately to set correct UI state
  useEffect(() => {
    // Check if this is a sign-up flow by looking for plan data
    try {
      const storedPlanData = window.sessionStorage.getItem('oauth_plan_data')
      if (storedPlanData) {
        console.log('🎯 Plan data detected - this is a sign-up flow')
        setIsSignUp(true)
      }
    } catch (e) {
      console.log('Error checking plan data for UI state:', e)
    }
  }, [])

  useEffect(() => {
    // Prevent multiple executions from hot reload
    if (hasStarted) {
      console.log('🔄 OAuth callback already in progress, skipping...')
      return
    }
    
    setHasStarted(true)
    handleCallback()
  }, [hasStarted])

  const handleCallback = async () => {
    try {
      console.log('🔄 Client-side OAuth callback processing...')
      
      // Get the auth code and state from URL
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      // Check for OAuth errors
      if (errorParam) {
        console.error('❌ OAuth error:', errorParam, errorDescription)
        setError(errorDescription || errorParam || 'Authentication failed')
        setStatus('error')
        setTimeout(() => {
          router.push('/login?error=oauth_failed')
        }, 3000)
        return
      }
      
      if (!code) {
        console.error('❌ No authorization code received')
        setError('No authorization code received')
        setStatus('error')
        setTimeout(() => {
          router.push('/login?error=missing_code')
        }, 3000)
        return
      }
      
      console.log('🔑 Processing OAuth code on client side...')
      setStatus('authenticating')
      
      // Initialize Supabase client (this will have access to localStorage with code verifier)
      const supabase = createClient()
      
      // Let Supabase automatically handle the session from the URL
      // This is more reliable than manual code exchange
      console.log('🔐 Waiting for Supabase to process OAuth callback...')
      
      // Debug: Check if we reach this point
      console.log('🧪 DEBUG: About to start session polling...')
      
      // Wait longer and poll for session establishment (up to 10 seconds)
      let session = null
      let sessionError = null
      let attempts = 0
      const maxAttempts = 20 // 10 seconds with 500ms intervals
      
      console.log('🧪 DEBUG: Starting polling loop...')
      
      while (!session && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const result = await supabase.auth.getSession()
        session = result.data.session
        sessionError = result.error
        
        attempts++
        console.log(`🔍 Session check ${attempts}/${maxAttempts}:`, session ? '✅ Found' : '⏳ Waiting...')
        
        if (session) {
          console.log('✅ Session established!')
          break
        }
      }
      
      if (sessionError || !session) {
        console.error('❌ Session establishment error:', sessionError)
        
        // Fallback: Try manual code exchange
        console.log('🔄 Attempting manual code exchange as fallback...')
        
        // Debug: Check localStorage for code verifier
        const allKeys = Object.keys(window.localStorage)
        const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('sb-'))
        console.log('🔑 Auth-related localStorage keys:', authKeys)
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
          console.error('❌ Code exchange error:', exchangeError)
          setError(exchangeError.message || 'Failed to complete authentication')
          setStatus('error')
          setTimeout(() => {
            router.push('/login?error=exchange_failed')
          }, 3000)
          return
        }
        
        console.log('✅ Manual OAuth exchange successful!')
      } else {
        console.log('✅ OAuth session established automatically!')
      }
      
      setStatus('success')
      
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('❌ Failed to get user after exchange:', userError)
        setError('Failed to get user information')
        setStatus('error')
        setTimeout(() => {
          router.push('/login?error=user_fetch_failed')
        }, 3000)
        return
      }
      
      console.log('👤 User authenticated:', user.email)
      
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, onboarding_completed, role')
        .eq('id', user.id)
        .single()
      
      // If profile doesn't exist, create it
      if (!profile) {
        console.log('📝 Creating user profile...')
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'SHOP_OWNER',
            created_at: new Date().toISOString()
          })
        
        if (createError) {
          console.error('❌ Failed to create profile:', createError)
          // Continue anyway - user is authenticated
        } else {
          console.log('✅ Profile created successfully')
        }
      }
      
      // Check if there's stored plan selection (from sessionStorage)
      // First try sessionStorage (more reliable), then fall back to OAuth state
      let planData = null
      
      // Check sessionStorage first
      try {
        console.log('🔍 Checking sessionStorage for oauth_plan_data...')
        const storedPlanData = window.sessionStorage.getItem('oauth_plan_data')
        console.log('📋 SessionStorage result:', storedPlanData ? 'Data found' : 'No data')
        
        if (storedPlanData) {
          planData = JSON.parse(storedPlanData)
          console.log('📦 Found plan data in sessionStorage:', planData)
          setIsSignUp(true) // This is a sign-up flow since they have plan data
        } else {
          console.log('⚠️ No oauth_plan_data in sessionStorage')
          // Log all sessionStorage keys for debugging
          console.log('🔑 All sessionStorage keys:', Object.keys(window.sessionStorage))
        }
      } catch (e) {
        console.log('❌ Error reading sessionStorage:', e)
      }
      
      // Fall back to OAuth state parameter if no sessionStorage data
      if (!planData && state) {
        try {
          const { getOAuthSession } = await import('@/lib/oauth-session')
          const session = getOAuthSession(state)
          
          if (session && session.planId && session.billingPeriod) {
            console.log('📦 Found plan selection from OAuth state')
            planData = {
              planId: session.planId,
              billingPeriod: session.billingPeriod
            }
            setIsSignUp(true) // This is a sign-up flow since they have plan data
          }
        } catch (e) {
          console.log('No plan selection in OAuth state')
        }
      }
      
      // If we have plan data, redirect to complete the subscription
      if (planData && planData.planId && planData.billingPeriod) {
        console.log('🎯 Plan data found - redirecting to complete subscription')
        setStatus('redirecting')
        
        // Clear the stored plan data
        window.sessionStorage.removeItem('oauth_plan_data')
        
        // Redirect to OAuth completion with plan data
        const params = new URLSearchParams({
          planId: planData.planId,
          billingPeriod: planData.billingPeriod,
          oauth_success: 'true'
        })
        router.push(`/subscribe/oauth-complete?${params.toString()}`)
        return
      }
      
      // Determine where to redirect based on user status
      const hasActiveSubscription = profile?.subscription_status === 'active'
      const needsOnboarding = !profile?.onboarding_completed
      
      setStatus('redirecting')
      
      if (!hasActiveSubscription) {
        console.log('💳 No active subscription - redirecting to pricing')
        router.push('/subscribe?source=oauth_success')
      } else if (needsOnboarding) {
        console.log('🚀 Needs onboarding - redirecting to welcome')
        router.push('/welcome')
      } else {
        console.log('🏠 Fully set up - redirecting to dashboard')
        router.push('/dashboard')
      }
      
    } catch (err) {
      console.error('❌ Unexpected error in OAuth callback:', err)
      setError(err.message || 'An unexpected error occurred')
      setStatus('error')
      setTimeout(() => {
        router.push('/login?error=unexpected')
      }, 3000)
    }
  }

  const getStatusMessage = () => {
    const actionWord = isSignUp ? 'sign up' : 'sign in'
    const authWord = isSignUp ? 'Registration' : 'Authentication'
    
    switch (status) {
      case 'processing':
        return `Processing ${actionWord}...`
      case 'authenticating':
        return `Completing ${actionWord}...`
      case 'success':
        return `${authWord} successful!`
      case 'redirecting':
        return isSignUp ? 'Redirecting to billing...' : 'Redirecting you now...'
      case 'error':
        return `${authWord} failed`
      default:
        return 'Please wait...'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="mb-6">
            <div className="text-6xl mb-4">{getStatusIcon()}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'error' ? 'Oops!' : (isSignUp ? 'Completing Sign Up' : 'Completing Sign In')}
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
                Redirecting you back to login...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                {isSignUp ? '🎉 Welcome! Setting up your account...' : '🎉 Welcome back! Redirecting you...'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔒 Secure authentication powered by Supabase
          </p>
        </div>
      </div>
    </div>
  )
}