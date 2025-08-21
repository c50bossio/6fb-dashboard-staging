'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function TestGoogleAuth() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  
  const testGoogleAuth = async () => {
    setStatus('Initiating Google OAuth...')
    setError('')
    
    try {
      const supabase = createClient()
      
      // Use the exact pattern from Supabase docs
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        setError(`OAuth Error: ${error.message}`)
        console.error('OAuth error:', error)
      } else {
        setStatus('Redirecting to Google...')
        // The browser will redirect automatically
      }
    } catch (err) {
      setError(`Exception: ${err.message}`)
      console.error('Exception:', err)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Test Google OAuth</h2>
          <p className="mt-2 text-center text-gray-600">
            Debug Google Sign-In/Sign-Up
          </p>
        </div>
        
        {status && (
          <div className="p-4 bg-blue-50 text-blue-700 rounded">
            {status}
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <button
          onClick={testGoogleAuth}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Test Google Sign In
        </button>
        
        <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
          <h3 className="font-semibold mb-2">Configuration Checklist:</h3>
          <ul className="space-y-1 text-gray-600">
            <li>✓ Google Cloud Console configured</li>
            <li>✓ Supabase Google provider enabled</li>
            <li>✓ Site URL set to https://bookedbarber.com</li>
            <li>✓ Redirect URLs configured</li>
            <li>✓ Callback route at /auth/callback</li>
          </ul>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          Check browser console for debug output
        </div>
      </div>
    </div>
  )
}