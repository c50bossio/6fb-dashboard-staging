'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function TestOAuthV2() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const signInWithGoogle = async (callbackPath) => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const redirectUrl = `${window.location.origin}${callbackPath}`
      
      console.log('Starting OAuth with redirect:', redirectUrl)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
      })
      
      if (error) {
        setError(error.message)
        setLoading(false)
      }
      
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }
  
  const checkCurrentSession = async () => {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      alert(`Error: ${error.message}`)
    } else if (session) {
      alert(`Logged in as: ${session.user.email}`)
    } else {
      alert('No active session')
    }
  }
  
  const clearSession = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    alert('Session cleared')
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Test Page V2</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions:</h2>
          <div className="flex gap-4">
            <button
              onClick={checkCurrentSession}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Check Session
            </button>
            <button
              onClick={clearSession}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Clear Session
            </button>
            <a
              href="/api/auth/test-supabase"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Test Supabase Health
            </a>
          </div>
        </div>
        
        <div className="grid gap-4">
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 1: Original Callback</h3>
            <p className="text-sm text-gray-400 mb-3">Uses the standard callback with timeout protection</p>
            <button
              onClick={() => signInWithGoogle('/auth/callback')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Sign in with Google (Original)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 2: Auto-Detect Callback</h3>
            <p className="text-sm text-gray-400 mb-3">Simplified approach that lets Supabase handle OAuth</p>
            <button
              onClick={() => signInWithGoogle('/auth/callback-v2')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
            >
              Sign in with Google (V2)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 3: Simple Redirect</h3>
            <p className="text-sm text-gray-400 mb-3">Ultra-simple callback that just redirects</p>
            <button
              onClick={() => signInWithGoogle('/auth/callback-simple')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500"
            >
              Sign in with Google (Simple)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 4: Debug Callback</h3>
            <p className="text-sm text-gray-400 mb-3">Detailed logging to diagnose issues</p>
            <button
              onClick={() => signInWithGoogle('/auth/debug-callback')}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"
            >
              Sign in with Google (Debug)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 5: Minimal Client</h3>
            <p className="text-sm text-gray-400 mb-3">Uses simplified browser client configuration</p>
            <button
              onClick={() => signInWithGoogle('/auth/callback-minimal')}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500"
            >
              Sign in with Google (Minimal)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 6: Core Client</h3>
            <p className="text-sm text-gray-400 mb-3">Uses core @supabase/supabase-js instead of SSR</p>
            <button
              onClick={() => signInWithGoogle('/auth/callback-core')}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
            >
              Sign in with Google (Core)
            </button>
          </div>
          
          <div className="p-4 bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Option 7: Direct OAuth</h3>
            <p className="text-sm text-gray-400 mb-3">Bypass SDK and use direct OAuth URL</p>
            <button
              onClick={() => window.location.href = '/api/auth/direct-google?redirect=/auth/debug-callback'}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Sign in with Google (Direct)
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}
        
        <div className="mt-6 text-center text-gray-400">
          <p>Console logs will show detailed debugging information</p>
          <p className="mt-2">
            <a href="/login" className="text-blue-400 hover:underline">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}