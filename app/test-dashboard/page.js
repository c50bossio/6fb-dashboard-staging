'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'

export default function TestDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Create Supabase client directly
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Check session
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
        } else if (session) {
          setUser(session.user)
        } else {
          setError('No active session - please log in')
        }
      } catch (err) {
        setError(`Error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Issue</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="space-y-2">
            <a 
              href="/test-auth" 
              className="block text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Login Test
            </a>
            <a 
              href="/login" 
              className="block text-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Go to Main Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Test Dashboard</h1>
          
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Authentication Successful!</h2>
            <div className="text-sm text-gray-700">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Provider:</strong> {user.app_metadata?.provider || 'unknown'}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Session Info</h3>
              <p className="text-sm">Authenticated: ✅</p>
              <p className="text-sm">Role: {user.role || 'user'}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Auth Methods</h3>
              <p className="text-sm">Email: {user.email ? '✅' : '❌'}</p>
              <p className="text-sm">Phone: {user.phone ? '✅' : '❌'}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                  )
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Sign Out
              </button>
              <a 
                href="/dashboard" 
                className="block text-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Try Main Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}