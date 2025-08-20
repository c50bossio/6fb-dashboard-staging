'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { useRouter } from 'next/navigation'

export default function SimpleLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  
  const signInWithGoogle = async () => {
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    // Super simple - just call signInWithOAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/simple-callback`
      }
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Simple Supabase Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Using the most basic Supabase OAuth pattern
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with Google'}
        </button>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Configuration Required:</h3>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
            <li>Supabase Site URL: Set to your domain</li>
            <li>Redirect URLs: Include your domain/**</li>
            <li>Google OAuth: Enabled in Supabase</li>
            <li>Google Cloud: Callback URL must be Supabase project URL</li>
          </ul>
        </div>
      </div>
    </div>
  )
}