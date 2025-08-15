'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'

export default function AuthCallback() {
  const router = useRouter()
  
  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      
      // Get the auth code from URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (!code) {
        console.error('No auth code in URL')
        router.push('/login')
        return
      }
      
      try {
        // Exchange the code for a session - client-side has access to PKCE cookies
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error('OAuth exchange error:', error)
          router.push('/login?error=oauth_failed')
          return
        }
        
        // Get user to check onboarding status
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('email', user.email)
            .single()
          
          // Redirect based on onboarding status
          if (profile?.onboarding_completed) {
            router.push('/dashboard')
          } else {
            router.push('/welcome')
          }
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Callback error:', err)
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