'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function OAuthHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      if (error) {
        console.error('OAuth error:', error, errorDescription)
        router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }
      
      if (code) {
        console.log('🔐 OAuth code detected, exchanging for session...')
        
        try {
          const supabase = createClient()
          
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('❌ Code exchange error:', exchangeError)
            router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`)
            return
          }
          
          console.log('✅ OAuth session established:', data?.user?.email)
          
          // Check if profile exists
          if (data?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()
            
            if (profileError && profileError.code === 'PGRST116') {
              // Create profile if it doesn't exist
              console.log('📝 Creating profile for OAuth user')
              
              await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
                  avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
                  role: 'CLIENT',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
            }
          }
          
          // Clean URL by removing code parameter
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('code')
          newUrl.searchParams.delete('error')
          newUrl.searchParams.delete('error_description')
          
          // Replace URL without code parameter
          window.history.replaceState({}, '', newUrl.toString())
          
          // Reload to trigger auth state update
          window.location.reload()
          
        } catch (err) {
          console.error('❌ OAuth handler error:', err)
          router.push('/login?error=Authentication%20failed')
        }
      }
    }
    
    handleOAuthCallback()
  }, [searchParams, router])
  
  return null
}