'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function OAuthTest() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  
  // Create Supabase client directly
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  useEffect(() => {
    // Check if we're returning from OAuth
    const checkOAuthReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code) {
        setMessage('Processing OAuth callback...')
        
        // Let Supabase handle the code exchange automatically
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setMessage(`Success! Logged in as ${user.email}. Redirecting...`)
          // Direct redirect using window.location for reliability
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        }
      }
    }
    
    checkOAuthReturn()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', !!session)
      
      if (event === 'SIGNED_IN' && session) {
        setMessage(`Signed in as ${session.user.email}. Redirecting...`)
        // Use window.location for guaranteed redirect
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [supabase])
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('Initiating Google OAuth...')
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/oauth-test`
      }
    })
    
    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    }
  }
  
  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setMessage(`Already logged in as ${user.email}`)
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    } else {
      setMessage('Not logged in')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">OAuth Test Page</h1>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded">
            {message}
          </div>
        )}
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {loading ? 'Loading...' : 'Sign in with Google'}
        </button>
        
        <button
          onClick={checkAuthStatus}
          className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
        >
          Check Auth Status
        </button>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Direct OAuth test - bypassing all providers</p>
        </div>
      </div>
    </div>
  )
}