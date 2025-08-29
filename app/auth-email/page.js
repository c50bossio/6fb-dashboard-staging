'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthEmail() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [status, setStatus] = useState({ type: '', message: '' })
  const [user, setUser] = useState(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const handleSignUp = async (e) => {
    e.preventDefault()
    setStatus({ type: 'loading', message: 'Creating account...' })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth-email`
        }
      })

      if (error) {
        setStatus({ type: 'error', message: error.message })
      } else if (data?.user) {
        setStatus({ 
          type: 'success', 
          message: 'Account created! Check your email for verification link.' 
        })
        setUser(data.user)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setStatus({ type: 'loading', message: 'Signing in...' })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setStatus({ type: 'error', message: error.message })
      } else if (data?.session) {
        setStatus({ type: 'success', message: 'Signed in successfully!' })
        setUser(data.session.user)
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setStatus({ type: 'success', message: 'Signed out successfully' })
    }
  }

  const checkSession = async () => {
    setStatus({ type: 'loading', message: 'Checking session...' })
    
    try {
      // With timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timed out')), 3000)
      )
      
      const sessionPromise = supabase.auth.getSession()
      const { data, error } = await Promise.race([sessionPromise, timeout])
      
      if (error) {
        setStatus({ type: 'error', message: error.message })
      } else if (data?.session) {
        setUser(data.session.user)
        setStatus({ type: 'success', message: 'Active session found!' })
      } else {
        setStatus({ type: 'info', message: 'No active session' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Email Authentication
          </h1>
          <p className="text-gray-600 mb-6">
            Use email/password instead of Google OAuth
          </p>

          {/* Status Message */}
          {status.message && (
            <div className={`p-4 rounded-lg mb-6 ${
              status.type === 'error' ? 'bg-red-100 text-red-700' :
              status.type === 'success' ? 'bg-green-100 text-green-700' :
              status.type === 'loading' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {status.message}
            </div>
          )}

          {/* User Info */}
          {user && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-green-800">Authenticated as:</p>
              <p className="text-sm text-gray-700">{user.email}</p>
              <p className="text-xs text-gray-600 mt-1">ID: {user.id}</p>
              <button
                onClick={handleSignOut}
                className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Auth Form */}
          {!user && (
            <>
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-2 px-4 rounded-md transition ${
                    mode === 'signin' 
                      ? 'bg-white shadow text-blue-600 font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 px-4 rounded-md transition ${
                    mode === 'signup' 
                      ? 'bg-white shadow text-blue-600 font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* Additional Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={checkSession}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Check Current Session
            </button>
            
            <div className="mt-4 text-center">
              <a 
                href="/dashboard" 
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Try accessing dashboard →
              </a>
            </div>
          </div>

          {/* Test Credentials */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 mb-2">
              Quick Test Account:
            </p>
            <p className="text-xs text-gray-700">
              Email: test@example.com<br/>
              Password: testpass123
            </p>
            <p className="text-xs text-gray-600 mt-2">
              (Create this account first using Sign Up)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}