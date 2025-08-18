'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function TestOAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCallback, setSelectedCallback] = useState('/auth/callback')
  
  const callbacks = [
    { path: '/auth/callback', label: 'Original Callback' },
    { path: '/auth/callback-v2', label: 'Callback V2 (Auto-detect)' },
    { path: '/auth/callback-simple', label: 'Simple Callback' },
    { path: '/auth/server-callback', label: 'Server-side Callback' },
    { path: '/auth/debug-callback', label: 'Debug Callback (with logs)' }
  ]
  
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const redirectUrl = `${window.location.origin}${selectedCallback}`
      
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Callback Handler:</h2>
          <div className="space-y-2">
            {callbacks.map((cb) => (
              <label key={cb.path} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value={cb.path}
                  checked={selectedCallback === cb.path}
                  onChange={(e) => setSelectedCallback(e.target.value)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">{cb.label}</div>
                  <div className="text-sm text-gray-400">{cb.path}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test OAuth Flow:</h2>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
              {error}
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Session Tools:</h2>
          <div className="space-y-3">
            <button
              onClick={checkCurrentSession}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Check Current Session
            </button>
            <button
              onClick={clearSession}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Clear Session
            </button>
            <a
              href="/api/auth/test-oauth"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-center"
            >
              View OAuth Configuration
            </a>
          </div>
        </div>
        
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