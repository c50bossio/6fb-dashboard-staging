'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function OAuthImplicit() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  
  // Create Supabase client with implicit flow (no PKCE)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'implicit', // Use implicit flow instead of PKCE
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  )
  
  useEffect(() => {
    // Check current auth status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMessage(`Already logged in as ${user.email}. Redirecting...`)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    }
    
    checkAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', !!session)
      
      if (event === 'SIGNED_IN' && session) {
        setMessage(`Signed in as ${session.user.email}. Redirecting...`)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [supabase])
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('Initiating Google OAuth with implicit flow...')
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/oauth-implicit`
      }
    })
    
    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">OAuth Implicit Flow Test</h1>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded">
            {message}
          </div>
        )}
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with Google (Implicit Flow)'}
        </button>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Uses implicit flow (no PKCE) for simpler OAuth</p>
        </div>
      </div>
    </div>
  )
}