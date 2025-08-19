'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function AuthCallback() {
  const router = useRouter()
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔐 Auth callback page mounted')
        
        const supabase = createClient()
        
        // Import auth helpers
        const { handleOAuthCallback, checkSession } = await import('@/lib/supabase/auth-helpers')
        
        // Get the code from URL (check both query params and hash fragments)
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        
        const code = searchParams.get('code') || hashParams.get('code')
        const error = searchParams.get('error') || hashParams.get('error')
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
        
        // Also check for access_token in hash (implicit flow)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        console.log('📍 Callback params:', {
          hasCode: !!code,
          hasError: !!error,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          url: window.location.href
        })
        
        if (error) {
          console.error('❌ OAuth error:', error, errorDescription)
          router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }
        
        if (code) {
          console.log('🔄 Processing OAuth callback...')
          
          // First, try a quick session check (sometimes session is already there)
          try {
            const { data: { session: existingSession } } = await supabase.auth.getSession()
            if (existingSession?.user) {
              console.log('✅ Session already exists, redirecting immediately')
              router.push('/dashboard')
              return
            }
          } catch (quickCheckError) {
            console.log('⚠️ Quick session check failed, proceeding with code exchange')
          }
          
          // Add timeout to prevent hanging (reduced to 8 seconds total)
          const callbackTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Callback timeout after 8 seconds')), 8000)
          )
          
          try {
            const result = await Promise.race([
              handleOAuthCallback(supabase, code),
              callbackTimeout
            ])
            
            console.log('📊 Callback result:', result)
            
            if (!result.success) {
              console.error('❌ Callback processing failed:', result.error)
              // Try one more direct session check before giving up
              const { data: { session: lastChance } } = await supabase.auth.getSession()
              if (lastChance?.user) {
                console.log('✅ Found session on retry, redirecting')
                router.push('/dashboard')
                return
              }
              router.push(`/login?error=${encodeURIComponent(result.error.message)}`)
              return
            }
            
            if (result.existingSession || result.recovered) {
              console.log('✅ Session found or recovered, redirecting to dashboard')
              router.push('/dashboard')
              return
            }
            
            console.log('✅ New session established successfully')
            
            // Check if user needs onboarding
            const { user } = result.session
            if (user) {
              console.log('👤 User authenticated:', user.email)
              
              // Skip profile check for now - just go to dashboard
              console.log('📊 Redirecting to dashboard')
              router.push('/dashboard')
            } else {
              router.push('/dashboard')
            }
          } catch (timeoutError) {
            console.error('❌ Callback timeout or error:', timeoutError)
            // Fallback: try direct session check multiple times
            console.log('🔄 Attempting fallback session checks...')
            
            for (let i = 0; i < 3; i++) {
              try {
                const { data: { session: fallbackSession } } = await supabase.auth.getSession()
                if (fallbackSession?.user) {
                  console.log(`✅ Fallback session found on attempt ${i + 1}, redirecting to dashboard`)
                  router.push('/dashboard')
                  return
                }
                // Wait before next attempt
                if (i < 2) {
                  await new Promise(resolve => setTimeout(resolve, 500))
                }
              } catch (fallbackError) {
                console.error(`❌ Fallback attempt ${i + 1} failed:`, fallbackError)
              }
            }
            
            // Ultimate fallback: redirect to login with error
            router.push(`/login?error=callback_timeout`)
          }
        } else if (accessToken) {
          console.log('🔑 Found access token in hash, handling implicit flow...')
          
          // Wait a moment for Supabase to auto-detect the session from URL
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // For implicit flow, Supabase should auto-detect with detectSessionInUrl: true
          try {
            const { data: { session: implicitSession } } = await supabase.auth.getSession()
            console.log('📊 Implicit session check:', {
              hasSession: !!implicitSession,
              hasUser: !!implicitSession?.user,
              userEmail: implicitSession?.user?.email
            })
            
            if (implicitSession?.user) {
              console.log('✅ Implicit flow session found, redirecting to dashboard')
              router.push('/dashboard')
              return
            } else {
              console.log('⚠️ Access token found but no session, trying to set session manually')
              // Try to use the session from URL hash
              const sessionFromHash = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              console.log('📊 SetSession result:', {
                hasSession: !!sessionFromHash.data?.session,
                hasUser: !!sessionFromHash.data?.session?.user,
                hasError: !!sessionFromHash.error,
                error: sessionFromHash.error?.message
              })
              
              if (sessionFromHash.error) {
                console.error('❌ Failed to set session from hash:', sessionFromHash.error)
                router.push('/login?error=session_set_failed')
                return
              }
              
              if (sessionFromHash.data?.session) {
                console.log('✅ Session set from hash tokens, redirecting to dashboard')
                router.push('/dashboard')
                return
              } else {
                console.error('❌ No session returned from setSession')
                router.push('/login?error=no_session_returned')
                return
              }
            }
          } catch (implicitError) {
            console.error('❌ Implicit flow session handling failed:', implicitError)
          }
          
          // If implicit flow fails, redirect to login
          router.push('/login?error=implicit_flow_failed')
        } else {
          console.log('⚠️ No code in callback, checking for existing session')
          
          const { hasSession } = await checkSession(supabase)
          if (hasSession) {
            console.log('✅ Valid session found, redirecting to dashboard')
            router.push('/dashboard')
          } else {
            console.log('❌ No valid session, redirecting to login')
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('❌ Callback error:', error)
        router.push('/login?error=callback_failed')
      }
    }
    
    handleCallback()
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Completing sign in...</p>
      </div>
    </div>
  )
}