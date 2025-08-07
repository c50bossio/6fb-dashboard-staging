'use client'

import Link from 'next/link'
import { useState } from 'react'

import { resetAuthState, debugAuthState } from '../../lib/auth-reset'

export default function LoginOptionsPage() {
  const [debugInfo, setDebugInfo] = useState(null)

  const handleDebug = () => {
    const info = debugAuthState()
    setDebugInfo(JSON.stringify(info, null, 2))
  }

  const handleReset = () => {
    if (confirm('This will clear all authentication data. Continue?')) {
      resetAuthState()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Login Options & Debugging</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Option 1: Regular Login */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">1. Regular Login</h2>
            <p className="text-gray-600 mb-4">
              Standard login using SupabaseAuthProvider with all auth state management
            </p>
            <Link 
              href="/login" 
              className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700"
            >
              Go to Regular Login
            </Link>
          </div>

          {/* Option 2: Simple Login */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">2. Simple Login</h2>
            <p className="text-gray-600 mb-4">
              Direct Supabase client login without auth provider - no shared state
            </p>
            <Link 
              href="/login-simple" 
              className="block w-full bg-green-600 text-white text-center py-2 rounded hover:bg-green-700"
            >
              Go to Simple Login
            </Link>
          </div>

          {/* Option 3: API Login */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">3. API-Based Login</h2>
            <p className="text-gray-600 mb-4">
              Uses Next.js API route - completely bypasses client-side auth logic
            </p>
            <Link 
              href="/login-api" 
              className="block w-full bg-purple-600 text-white text-center py-2 rounded hover:bg-purple-700"
            >
              Go to API Login
            </Link>
          </div>

          {/* Option 4: Test Page */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">4. Auth Test Page</h2>
            <p className="text-gray-600 mb-4">
              Interactive testing page with detailed logging and state inspection
            </p>
            <Link 
              href="/test-auth" 
              className="block w-full bg-orange-600 text-white text-center py-2 rounded hover:bg-orange-700"
            >
              Go to Test Page
            </Link>
          </div>
        </div>

        {/* Debug Tools */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Tools</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleDebug}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Show Auth State
              </button>
              
              <button
                onClick={handleReset}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Reset All Auth Data
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go to Home
              </button>
            </div>
            
            {debugInfo && (
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                {debugInfo}
              </pre>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">If login is stuck:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Reset All Auth Data" above</li>
            <li>Try the Simple Login or API-Based Login options</li>
            <li>Check browser console for error messages</li>
            <li>Use the Auth Test Page for detailed debugging</li>
            <li>As a last resort, clear browser cache and cookies</li>
          </ol>
        </div>
      </div>
    </div>
  )
}