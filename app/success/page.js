'use client'

import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const handleSessionDetection = async () => {
      console.log('🔄 Success page: Starting session detection...')
      
      const sessionId = searchParams.get('session_id')
      
      if (sessionId) {
        console.log('✅ Stripe session detected, bypassing auth check temporarily')
        console.log('📦 Session ID:', sessionId)
        
        const plan = searchParams.get('plan') || 'shop'
        const billing = searchParams.get('billing') || 'monthly'
        
        console.log('📦 Plan:', plan, 'Billing:', billing)
        
        setLoading(false)
        
        setTimeout(() => {
          console.log('🔄 Redirecting to welcome page for onboarding...')
          router.push(`/welcome?stripe_session=${sessionId}&setup=initial&plan=${plan}&billing=${billing}`)
        }, 2000)
        
        return
      }
      
      if (user) {
        console.log('✅ User session available, initializing...')
        initializeUser()
        return
      }
      
      console.log('⚠️ No session detected, redirecting to welcome for setup...')
      setLoading(false)
      
      setTimeout(() => {
        router.push('/welcome?from=payment_success&plan=shop')
      }, 2000)
    }
    
    handleSessionDetection()
  }, [user, searchParams])

  const initializeUser = async () => {
    try {
      const sessionId = searchParams.get('session_id')
      const plan = searchParams.get('plan') || 'unknown'
      const billing = searchParams.get('billing') || 'monthly'
      
      console.log('✅ Payment successful, initializing user...')
      console.log('📦 Session ID:', sessionId)
      console.log('🎯 Plan:', plan, '| Billing:', billing)
      
      setLoading(true)
      
      const response = await fetch('/api/user/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, plan, billing })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log('✅ User profile created successfully:', result.profile?.email)
        setLoading(false)
        
        setTimeout(() => {
          console.log('🔄 Redirecting to welcome page for account setup...')
          router.push(`/welcome?plan=${plan}&billing=${billing}`)
        }, 2000)
        
      } else {
        console.error('❌ Profile creation failed:', result)
        
        const canRetry = !['PERMISSION_DENIED', 'AUTH_REQUIRED'].includes(result.code)
        
        setLoading(false)
        
        setError({
          type: result.code || 'UNKNOWN_ERROR',
          message: result.error || 'Account setup failed',
          details: result.details || 'Please try again or contact support',
          canRetry: canRetry,
          sessionId: sessionId
        })
      }
      
    } catch (error) {
      console.error('❌ User initialization network error:', error)
      setLoading(false)
      
      setError({
        type: 'NETWORK_ERROR',
        message: 'Connection failed',
        details: 'Unable to complete account setup. Please check your connection and try again.',
        canRetry: true,
        sessionId: searchParams.get('session_id')
      })
    }
  }
  
  const handleRetryInitialization = () => {
    console.log('🔄 Retrying user initialization...')
    setError(null)
    setLoading(true)
    
    setTimeout(() => {
      initializeUser()
    }, 1000)
  }
  
  const handleSkipToLogin = () => {
    console.log('↩️ Skipping to manual login...')
    router.push('/login?message=account_setup_incomplete')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to BookedBarber!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your payment was successful and your account is being set up.
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span className="text-gray-600">Setting up your account...</span>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="text-red-600 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{error.message}</h3>
                <p className="text-sm text-gray-600 mb-4">{error.details}</p>
                
                {error.canRetry && (
                  <div className="space-y-2">
                    <button
                      onClick={handleRetryInitialization}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                <div className="space-y-2 mt-3">
                  <button
                    onClick={handleSkipToLogin}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign In Manually
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Error Type: {error.type}
                    {error.sessionId && <span className="block">Session: {error.sessionId.substring(0, 20)}...</span>}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-green-600">
              ✅ Payment successful! Redirecting to account setup...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}