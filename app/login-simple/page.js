'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function SimpleLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  
  // Check auth state on mount and redirect if logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('User already logged in, redirecting to dashboard')
        router.push('/dashboard')
      }
    }
    
    checkAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event)
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, redirecting to dashboard')
        router.push('/dashboard')
      }
    })
    
    return () => subscription.unsubscribe()
  }, [router, supabase])
  
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login-simple`
        }
      })
      
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Simple Login Test</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with Google'}
        </button>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>This is a simplified OAuth test page</p>
        </div>
      </div>
    </div>
  )
}