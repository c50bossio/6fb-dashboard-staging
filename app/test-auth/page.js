'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function TestAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Create Supabase client only once using useMemo
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      console.error('Missing Supabase environment variables')
      return null
    }
    
    return createBrowserClient(url, key)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setMessage('Supabase client not initialized')
      return
    }

    // Check current session
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', session?.user?.email)
      setUser(session?.user || null)
      setMessage(`Auth event: ${event}`)
      setInitialized(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const checkSession = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('Current session:', session, 'Error:', error)
      setUser(session?.user || null)
      setLoading(false)
    } catch (err) {
      console.error('Session check error:', err)
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setMessage('Starting Google sign in...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/test-auth`
        }
      })
      
      if (error) {
        setMessage(`Error: ${error.message}`)
        console.error('OAuth error:', error)
      } else {
        setMessage('Redirecting to Google...')
      }
    } catch (err) {
      setMessage(`Exception: ${err.message}`)
      console.error('Sign in exception:', err)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(`Sign out error: ${error.message}`)
    } else {
      setMessage('Signed out successfully')
      setUser(null)
    }
  }

  const testDatabaseConnection = async () => {
    try {
      setMessage('Testing database connection...')
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      if (error) {
        setMessage(`Database error: ${error.message}`)
      } else {
        setMessage('Database connection successful!')
      }
    } catch (err) {
      setMessage(`Database exception: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading...</div>
          <div className="text-gray-600">Checking authentication status</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8">Simple Auth Test</h1>
        
        {/* Status Section */}
        <div className="mb-8 p-4 bg-gray-50 rounded">
          <h2 className="text-xl font-semibold mb-2">Current Status</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">User: </span>
              <span className={user ? 'text-green-600' : 'text-red-600'}>
                {user ? user.email : 'Not logged in'}
              </span>
            </div>
            <div>
              <span className="font-medium">User ID: </span>
              <span className="font-mono text-sm">{user?.id || 'None'}</span>
            </div>
            <div>
              <span className="font-medium">Message: </span>
              <span className="text-blue-600">{message || 'Ready'}</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-4">
          {!user ? (
            <button
              onClick={signInWithGoogle}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Sign in with Google
            </button>
          ) : (
            <>
              <button
                onClick={signOut}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Sign Out
              </button>
              <button
                onClick={testDatabaseConnection}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Test Database Connection
              </button>
            </>
          )}
          
          <button
            onClick={checkSession}
            className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Refresh Session Status
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <div className="text-xs font-mono space-y-1">
            <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
            <div>Current URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</div>
            <div>Session Storage: {typeof window !== 'undefined' ? Object.keys(window.sessionStorage).length : 0} items</div>
            <div>Local Storage: {typeof window !== 'undefined' ? Object.keys(window.localStorage).length : 0} items</div>
          </div>
        </div>

        {/* Console Instructions */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">📝 Check Browser Console</h3>
          <p className="text-sm">
            Open your browser's developer console (F12) to see detailed logs about the authentication flow.
          </p>
        </div>
      </div>
    </div>
  )
}