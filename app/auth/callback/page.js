'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
        
        // Get the code from URL
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        console.log('📍 Callback params:', {
          hasCode: !!code,
          hasError: !!error,
          url: window.location.href
        })
        
        if (error) {
          console.error('❌ OAuth error:', error, errorDescription)
          router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }
        
        if (code) {
          console.log('🔄 Processing OAuth callback...')
          
          const result = await handleOAuthCallback(supabase, code)
          
          if (!result.success) {
            console.error('❌ Callback processing failed:', result.error)
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
            
            // Check profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            
            if (!profile || !profile.shop_name) {
              console.log('🎯 User needs onboarding')
              router.push('/welcome')
            } else {
              console.log('📊 Redirecting to dashboard')
              router.push('/dashboard')
            }
          } else {
            router.push('/dashboard')
          }
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