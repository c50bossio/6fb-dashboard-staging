'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        console.log('🔐 Client-side OAuth Callback Started')
        console.log('   Has code:', !!code)
        console.log('   Has error:', !!error)

        // Handle OAuth errors
        if (error) {
          console.error('❌ OAuth Error:', error, errorDescription)
          setError(`Authentication failed: ${errorDescription || error}`)
          setTimeout(() => {
            router.push(`/login?error=${error}`)
          }, 2000)
          return
        }

        // Check for authorization code
        if (!code) {
          console.error('❌ No authorization code received')
          setError('No authorization code received')
          setTimeout(() => {
            router.push('/login?error=no_code')
          }, 2000)
          return
        }

        setStatus('Exchanging authorization code...')
        
        // Get Supabase client - this will use the same instance that initiated OAuth
        const supabase = createClient()
        
        // Let Supabase handle the code exchange automatically
        // The client will find its own PKCE cookies
        console.log('🔄 Letting Supabase handle session from URL...')
        
        // Get the session from the URL (Supabase handles this automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          setError(`Session error: ${sessionError.message}`)
          setTimeout(() => {
            router.push('/login?error=session_error')
          }, 2000)
          return
        }

        // Check if we have a valid session
        if (!session) {
          console.log('⚠️ No session found, checking for user...')
          
          // Try to get the user
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError || !user) {
            console.error('❌ No authenticated user found')
            setError('Authentication failed - no user session')
            setTimeout(() => {
              router.push('/login?error=no_session')
            }, 2000)
            return
          }
        }

        console.log('✅ Authentication successful!')
        setStatus('Authentication successful! Checking your account...')

        // Get user profile to check onboarding status
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          console.log('👤 Authenticated user:', user.email)
          
          // Check profile and onboarding status
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .single()

          if (profileError) {
            console.log('📝 Profile not found, might be new user')
            setStatus('Setting up your account...')
            router.push('/welcome?from=oauth')
            return
          }

          if (profile) {
            console.log('📋 User profile found:', {
              email: profile.email,
              onboardingCompleted: profile.onboarding_completed,
              subscriptionStatus: profile.subscription_status
            })

            // Route based on onboarding status
            if (!profile.onboarding_completed) {
              console.log('➡️ Redirecting to welcome (onboarding needed)')
              setStatus('Redirecting to complete setup...')
              router.push('/welcome?from=oauth&needs_onboarding=true')
            } else {
              console.log('➡️ Redirecting to dashboard (onboarding complete)')
              setStatus('Redirecting to dashboard...')
              router.push('/dashboard')
            }
          }
        }
      } catch (error) {
        console.error('💥 Unexpected error in OAuth callback:', error)
        setError('An unexpected error occurred')
        setTimeout(() => {
          router.push('/login?error=unexpected')
        }, 2000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="card-elevated backdrop-blur-sm max-w-md w-full mx-4">
        <div className="text-center">
          {!error ? (
            <>
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Completing Sign In
              </h2>
              <p className="text-muted-foreground">{status}</p>
            </>
          ) : (
            <>
              <div className="text-destructive mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Authentication Failed
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <p className="text-sm text-muted-foreground">Redirecting back to login...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}