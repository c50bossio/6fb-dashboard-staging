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
      
      // 🧠 CRITICAL: Register OAuth session for memory management
      const sessionId = `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      try {
        await fetch('/api/auth/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            sessionId,
            sessionData: { 
              url: window.location.href,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          })
        })
        console.log(`🧠 OAuth session registered for memory management: ${sessionId}`)
      } catch (memErr) {
        console.warn('⚠️ Failed to register OAuth session for memory tracking:', memErr)
      }
      
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
      
      // Initialize Supabase client
      const supabase = createClient()
      
      // Simplified and more reliable OAuth code exchange
      console.log('🔐 Starting OAuth code exchange...')
      
      try {
        // Use Supabase's built-in URL-based session detection
        // This is more reliable than manual PKCE handling
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
          console.error('❌ Code exchange error:', exchangeError.message)
          
          // Try alternative: let Supabase auto-detect from URL
          console.log('🔄 Trying URL-based session detection...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: { session: urlSession } } = await supabase.auth.getSession()
          if (!urlSession) {
            setError('Authentication failed. Please try again.')
            setStatus('error')
            setTimeout(() => {
              router.push('/login?error=auth_failed')
            }, 3000)
            return
          }
          console.log('✅ URL-based session detection successful!')
        } else {
          console.log('✅ OAuth code exchanged successfully!')
        }
        
      } catch (exchangeErr) {
        console.error('❌ Exchange attempt failed:', exchangeErr)
        
        // Final fallback: check if session exists anyway
        console.log('🔄 Final fallback: checking for existing session...')
        const { data: { session: fallbackSession } } = await supabase.auth.getSession()
        if (!fallbackSession) {
          setError('Authentication could not be completed')
          setStatus('error')
          setTimeout(() => {
            router.push('/login?error=final_auth_failed')
          }, 3000)
          return
        }
        console.log('✅ Fallback session check successful!')
      }
      
      // Final session verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ Final session verification failed:', sessionError)
        setError('Session verification failed')
        setStatus('error')
        setTimeout(() => {
          router.push('/login?error=session_verification_failed')
        }, 3000)
        return
      }
      
      console.log('✅ Session verified:', session.user.email)
      
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
      let profile = null;
      try {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status, onboarding_completed, role')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is fine
          console.error('⚠️ Profile query error:', profileError)
        }
        
        profile = existingProfile;
      } catch (e) {
        console.log('⚠️ Profile check failed:', e)
      }
      
      // If profile doesn't exist, create it
      if (!profile) {
        console.log('📝 Creating user profile...')
        try {
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
            console.error('⚠️ Profile creation error (continuing anyway):', createError)
          } else {
            console.log('✅ Profile created successfully')
          }
        } catch (e) {
          console.log('⚠️ Profile creation failed (continuing anyway):', e)
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
        
        // Also log all sessionStorage keys for debugging
        const sessionKeys = Object.keys(window.sessionStorage)
        console.log('🔑 All sessionStorage keys:', sessionKeys)
        sessionKeys.forEach(key => {
          const value = window.sessionStorage.getItem(key)
          console.log(`  ${key}: ${value?.substring(0, 50)}...`)
        })
        
        if (storedPlanData) {
          planData = JSON.parse(storedPlanData)
          console.log('📦 Found plan data in sessionStorage:', planData)
          setIsSignUp(true) // This is a sign-up flow since they have plan data
        } else {
          console.log('⚠️ No oauth_plan_data in sessionStorage')
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
      console.log('🎯 Determining redirect based on profile:', {
        hasProfile: !!profile,
        subscription_status: profile?.subscription_status,
        onboarding_completed: profile?.onboarding_completed,
        role: profile?.role
      })
      
      const hasActiveSubscription = profile?.subscription_status === 'active'
      const needsOnboarding = !profile?.onboarding_completed
      
      setStatus('redirecting')
      
      // Determine redirect URL
      let redirectUrl = '/dashboard'; // Default fallback
      
      if (!hasActiveSubscription) {
        console.log('💳 No active subscription - redirecting to pricing')
        redirectUrl = '/subscribe?source=oauth_success';
      } else if (needsOnboarding) {
        console.log('🚀 Needs onboarding - redirecting to welcome')
        redirectUrl = '/welcome';
      } else {
        console.log('🏠 Fully set up - redirecting to dashboard')
        redirectUrl = '/dashboard';
      }
      
      console.log('🎯 Redirecting to:', redirectUrl)
      
      // 🧠 CRITICAL: Clean up OAuth session before redirect to prevent memory leaks
      try {
        await fetch('/api/auth/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cleanup',
            sessionId
          })
        })
        console.log(`🧹 OAuth session cleaned up: ${sessionId}`)
      } catch (cleanupErr) {
        console.warn('⚠️ Failed to cleanup OAuth session:', cleanupErr)
      }
      
      // Try multiple redirect methods to ensure it works
      try {
        // Method 1: Next.js router
        router.push(redirectUrl);
        
        // Method 2: Fallback to window.location after delay
        setTimeout(() => {
          if (window.location.pathname === '/auth/callback') {
            console.log('⚠️ Router.push failed, using window.location')
            window.location.href = redirectUrl;
          }
        }, 1000);
      } catch (routerError) {
        console.error('❌ Router error, using fallback:', routerError)
        window.location.href = redirectUrl;
      }
    } catch (err) {
      console.error('❌ Unexpected error in OAuth callback:', err)
      
      // 🧠 CRITICAL: Clean up OAuth session even on error to prevent memory leaks
      try {
        await fetch('/api/auth/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cleanup',
            sessionId
          })
        })
        console.log(`🧹 OAuth session cleaned up after error: ${sessionId}`)
      } catch (cleanupErr) {
        console.warn('⚠️ Failed to cleanup OAuth session after error:', cleanupErr)
        // Emergency cleanup of all sessions if individual cleanup fails
        try {
          await fetch('/api/auth/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cleanup' }) // Clean up all expired sessions
          })
        } catch (emergencyErr) {
          console.error('❌ Emergency cleanup also failed:', emergencyErr)
        }
      }
      
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