'use client'

import { useEffect } from 'react'

export default function AuthCallback() {
  console.log('🎯 AuthCallback component mounted')
  
  useEffect(() => {
    console.log('🚀 AuthCallback useEffect running')
    
    // Check if user needs onboarding before redirecting
    const checkUserOnboarding = async () => {
      try {
        console.log('🔍 Current URL:', window.location.href)
        console.log('🔍 URL Hash:', window.location.hash)
        console.log('🔍 URL Search:', window.location.search)
        
        // Supabase can put auth info in either hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const error = queryParams.get('error') || hashParams.get('error')
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description')
        
        if (error) {
          console.error('❌ OAuth error:', error, errorDescription)
          // Redirect to login with error message
          window.location.href = `/login?error=${encodeURIComponent(errorDescription || error)}`
          return
        }
        
        if (accessToken) {
          console.log('🔑 Found access token, auth successful!')
          
          // Always go to welcome first - it will redirect if needed
          console.log('📍 Redirecting to dashboard page...')
          window.location.href = '/dashboard'
        } else {
          // Check if we have a code that needs to be exchanged
          const code = queryParams.get('code')
          if (code) {
            console.log('🔄 Found auth code, waiting for Supabase to exchange it...')
            // Give Supabase more time to process the code
            setTimeout(() => {
              // After waiting, redirect to welcome
              console.log('📍 Redirecting to dashboard after code exchange...')
              window.location.href = '/dashboard'
            }, 1000)
          } else {
            console.log('⚠️ No access token or code found')
            console.log('Debug info:', {
              hash: window.location.hash,
              search: window.location.search,
              hashParams: Object.fromEntries(hashParams),
              queryParams: Object.fromEntries(queryParams)
            })
            // Still redirect to welcome - let it handle auth check
            window.location.href = '/dashboard'
          }
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error)
        window.location.href = '/dashboard'
      }
    }
    
    // Give Supabase time to properly establish the session
    const timer = setTimeout(() => {
      console.log('⏰ Timer fired, checking where to redirect...')
      checkUserOnboarding()
    }, 1500) // Increased from 100ms to 1.5s for proper session establishment
    
    return () => {
      console.log('🧹 Cleaning up timer')
      clearTimeout(timer)
    }
  }, [])
  
  console.log('🎨 Rendering AuthCallback UI')
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Completing sign in...</p>
      </div>
    </div>
  )
}