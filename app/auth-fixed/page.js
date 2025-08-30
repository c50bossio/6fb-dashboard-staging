'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'

export default function AuthFixed() {
  const [status, setStatus] = useState('initializing')
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Initialize without checking session first
    setStatus('ready')
    setMessage('Click "Sign in with Google" to authenticate')
  }, [])

  const signInWithGoogle = async () => {
    try {
      setStatus('signing-in')
      setMessage('Redirecting to Google...')
      
      // Create a fresh client for auth
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-fixed/callback`,
          skipBrowserRedirect: false
        }
      })
      
      if (error) {
        setStatus('error')
        setMessage(`Error: ${error.message}`)
      }
    } catch (err) {
      setStatus('error')
      setMessage(`Exception: ${err.message}`)
    }
  }

  const checkSessionManual = async () => {
    try {
      setStatus('checking')
      setMessage('Checking session (max 2 seconds)...')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Use Promise.race with a timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timed out')), 2000)
      )
      
      const sessionCheck = supabase.auth.getSession()
      
      try {
        const result = await Promise.race([sessionCheck, timeout])
        
        if (result?.data?.session) {
          setUser(result.data.session.user)
          setStatus('authenticated')
          setMessage('Session found!')
        } else {
          setStatus('not-authenticated')
          setMessage('No active session')
        }
      } catch (timeoutError) {
        setStatus('timeout')
        setMessage('Session check timed out - this is the issue!')
      }
    } catch (err) {
      setStatus('error')
      setMessage(`Error: ${err.message}`)
    }
  }

  const clearStorage = () => {
    // Clear all Supabase-related storage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear session storage too
    const sessionKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
    
    setMessage('Storage cleared! Try signing in again.')
    setStatus('ready')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Fixed Authentication Test</h1>
          
          {/* Status Display */}
          <div className={`p-4 rounded mb-6 ${
            status === 'authenticated' ? 'bg-green-100 border-green-500' :
            status === 'error' ? 'bg-red-100 border-red-500' :
            status === 'timeout' ? 'bg-yellow-100 border-yellow-500' :
            'bg-blue-100 border-blue-500'
          } border`}>
            <div className="font-semibold mb-2">Status: {status}</div>
            <div className="text-sm">{message}</div>
            {user && (
              <div className="mt-2 text-sm">
                <div>User: {user.email}</div>
                <div>ID: {user.id}</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              disabled={status === 'signing-in'}
            >
              🔑 Sign in with Google
            </button>

            <button
              onClick={checkSessionManual}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
              disabled={status === 'checking'}
            >
              🔍 Check Session (Manual)
            </button>

            <button
              onClick={clearStorage}
              className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition font-medium"
            >
              🧹 Clear Storage & Reset
            </button>
          </div>

          {/* Diagnostic Info */}
          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Diagnostic Info:</h3>
            <div className="text-xs font-mono space-y-1">
              <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
              <div>Key Length: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0}</div>
              <div>LocalStorage Items: {typeof window !== 'undefined' ? localStorage.length : 0}</div>
              <div>SessionStorage Items: {typeof window !== 'undefined' ? sessionStorage.length : 0}</div>
            </div>
          </div>

          {/* Solution Explanation */}
          {status === 'timeout' && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded">
              <h3 className="font-semibold text-orange-800 mb-2">⚠️ Issue Identified</h3>
              <p className="text-sm text-gray-700">
                The session check is timing out, which means there's likely stale auth data in your browser storage.
                Click "Clear Storage & Reset" above, then try signing in again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}