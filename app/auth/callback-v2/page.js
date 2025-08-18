'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function AuthCallbackV2() {
  const router = useRouter()
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const handleCallback = async () => {
      console.log('🚀 Simplified OAuth callback starting...')
      
      try {
        const supabase = createClient()
        
        // Get URL parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        // Check for error in URL
        const error = searchParams.get('error') || hashParams.get('error')
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
        
        if (error) {
          console.error('OAuth provider error:', error, errorDescription)
          setError(errorDescription || error)
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
          }, 2000)
          return
        }
        
        // Method 1: Let Supabase handle it automatically
        // Supabase should detect the code/tokens in URL automatically
        console.log('Waiting for Supabase to process OAuth response...')
        
        // Give Supabase a moment to process
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('Session check:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: sessionError 
        })
        
        if (session?.user) {
          console.log('✅ Session found! User:', session.user.email)
          router.push('/dashboard')
          return
        }
        
        // Method 2: Try manual code exchange if auto-detection failed
        const code = searchParams.get('code')
        if (code) {
          console.log('Attempting manual code exchange...')
          
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (data?.session) {
              console.log('✅ Manual exchange successful!')
              router.push('/dashboard')
              return
            }
            
            if (exchangeError) {
              console.error('Exchange error:', exchangeError)
              // Check session one more time
              const { data: { session: retrySession } } = await supabase.auth.getSession()
              if (retrySession?.user) {
                console.log('✅ Session found after error')
                router.push('/dashboard')
                return
              }
            }
          } catch (exchangeErr) {
            console.error('Exchange failed:', exchangeErr)
          }
        }
        
        // Method 3: Check for access_token in URL (for implicit flow)
        const accessToken = hashParams.get('access_token')
        if (accessToken) {
          console.log('Found access token in URL hash')
          // Supabase should handle this automatically
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: { session: hashSession } } = await supabase.auth.getSession()
          if (hashSession?.user) {
            console.log('✅ Session from hash parameters')
            router.push('/dashboard')
            return
          }
        }
        
        // Final fallback
        console.log('No session could be established')
        setError('Unable to complete sign in. Please try again.')
        setTimeout(() => {
          router.push('/login?error=auth_failed')
        }, 2000)
        
      } catch (error) {
        console.error('Callback error:', error)
        setError('An unexpected error occurred')
        setTimeout(() => {
          router.push('/login?error=unexpected')
        }, 2000)
      }
    }
    
    // Start the callback process
    handleCallback()
  }, [router])
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white mb-2">Authentication failed</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-4">Redirecting to login...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-4 text-white">Completing sign in...</p>
        <p className="text-gray-500 text-xs mt-2">Please wait...</p>
      </div>
    </div>
  )
}