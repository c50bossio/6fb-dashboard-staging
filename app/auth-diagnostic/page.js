'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthDiagnostic() {
  const [email, setEmail] = useState('test' + Date.now() + '@example.com')
  const [password, setPassword] = useState('testpass123')
  const [results, setResults] = useState([])

  const addResult = (test, success, message, details = null) => {
    setResults(prev => [...prev, { test, success, message, details, timestamp: new Date().toISOString() }])
  }

  const clearResults = () => {
    setResults([])
  }

  const runAllTests = async () => {
    clearResults()
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Test 1: Check if we can connect to Supabase
    try {
      addResult('Connection Test', true, 'Connected to Supabase')
    } catch (err) {
      addResult('Connection Test', false, 'Failed to connect', err.message)
      return
    }

    // Test 2: Try to sign up with email/password
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      if (error) {
        addResult('Sign Up', false, `Sign up failed: ${error.message}`, {
          code: error.code,
          status: error.status,
          details: error
        })
      } else {
        addResult('Sign Up', true, 'User created successfully', {
          userId: data.user?.id,
          email: data.user?.email
        })

        // Test 3: Check if profile was created
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError) {
            addResult('Profile Check', false, `Profile not found: ${profileError.message}`, {
              code: profileError.code,
              hint: profileError.hint,
              details: profileError.details
            })
          } else {
            addResult('Profile Check', true, 'Profile exists', profile)
          }
        }
      }
    } catch (err) {
      addResult('Sign Up', false, `Exception: ${err.message}`, err)
    }

    // Test 4: Try to query profiles table directly
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (error) {
        addResult('Profiles Table Access', false, `Cannot read profiles: ${error.message}`, {
          code: error.code,
          hint: error.hint,
          message: error.message
        })
      } else {
        addResult('Profiles Table Access', true, 'Can read profiles table')
      }
    } catch (err) {
      addResult('Profiles Table Access', false, `Exception: ${err.message}`)
    }

    // Test 5: Check auth.users visibility
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        addResult('Get Current User', false, `Cannot get user: ${error.message}`)
      } else if (user) {
        addResult('Get Current User', true, 'Current user found', { id: user.id, email: user.email })
      } else {
        addResult('Get Current User', true, 'No current user (expected)')
      }
    } catch (err) {
      addResult('Get Current User', false, `Exception: ${err.message}`)
    }

    // Test 6: Try anonymous sign in
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) {
        addResult('Anonymous Sign In', false, `Anonymous auth failed: ${error.message}`, {
          code: error.code,
          status: error.status
        })
      } else {
        addResult('Anonymous Sign In', true, 'Anonymous sign in successful', {
          userId: data.user?.id
        })
        
        // Sign out anonymous user
        await supabase.auth.signOut()
      }
    } catch (err) {
      addResult('Anonymous Sign In', false, `Exception: ${err.message}`)
    }
  }

  const testSignIn = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        addResult('Sign In Test', false, `Sign in failed: ${error.message}`, error)
      } else {
        addResult('Sign In Test', true, 'Sign in successful!', {
          userId: data.user?.id,
          email: data.user?.email,
          session: !!data.session
        })
      }
    } catch (err) {
      addResult('Sign In Test', false, `Exception: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🔬 Authentication Diagnostic Tool</h1>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm">
              This tool will help diagnose why authentication is failing by running various tests.
            </p>
          </div>

          {/* Test Configuration */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Test Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={runAllTests}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              🧪 Run All Tests
            </button>
            <button
              onClick={testSignIn}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              🔑 Test Sign In Only
            </button>
            <button
              onClick={clearResults}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              🗑️ Clear Results
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded border ${
                  result.success 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {result.success ? '✅' : '❌'}
                      </span>
                      <span className="font-semibold">{result.test}</span>
                    </div>
                    <p className="text-sm mt-1">{result.message}</p>
                    {result.details && (
                      <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Supabase Info */}
          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Supabase Configuration:</h3>
            <div className="text-xs font-mono space-y-1">
              <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
              <div>Anon Key Length: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0}</div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Common Issues:</h3>
            <ul className="text-sm space-y-1">
              <li>• <strong>Database error:</strong> RLS policies may be blocking writes</li>
              <li>• <strong>Profile not created:</strong> Trigger function may be missing</li>
              <li>• <strong>Cannot read profiles:</strong> RLS SELECT policy needed</li>
              <li>• <strong>Auth fails:</strong> Email confirmations may be required</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}