'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function TestIntegrationPage() {
  const [status, setStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const { user, profile, supabase } = useAuth()

  useEffect(() => {
    checkAllServices()
  }, [])

  const checkAllServices = async () => {
    const results = {}
    
    // Check Supabase Auth
    try {
      const { data: { session } } = await supabase.auth.getSession()
      results.supabaseAuth = {
        status: session ? 'connected' : 'no session',
        user: session?.user?.email || 'none'
      }
    } catch (error) {
      results.supabaseAuth = { status: 'error', error: error.message }
    }

    // Check Supabase Database
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      results.supabaseDB = {
        status: error ? 'error' : 'connected',
        error: error?.message
      }
    } catch (error) {
      results.supabaseDB = { status: 'error', error: error.message }
    }

    // Check Backend API
    try {
      const response = await fetch('http://localhost:8001/health')
      const data = await response.json()
      results.backendAPI = {
        status: data.status,
        database: data.database
      }
    } catch (error) {
      results.backendAPI = { status: 'error', error: error.message }
    }

    // Check Frontend API
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      results.frontendAPI = {
        status: response.ok ? 'healthy' : 'unhealthy',
        data
      }
    } catch (error) {
      results.frontendAPI = { status: 'error', error: error.message }
    }

    setStatus(results)
    setLoading(false)
  }

  const testSignUp = async () => {
    try {
      const email = `test${Date.now()}@example.com`
      const password = 'TestPassword123!'
      
      const response = await fetch('http://localhost:8001/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: 'Test User',
          phone: '555-0100'
        })
      })
      
      const data = await response.json()
      alert(`Sign up ${response.ok ? 'successful' : 'failed'}: ${JSON.stringify(data)}`)
    } catch (error) {
      alert(`Sign up error: ${error.message}`)
    }
  }

  const testLogin = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@barbershop.com',
          password: 'demo123'
        })
      })
      
      const data = await response.json()
      alert(`Login ${response.ok ? 'successful' : 'failed'}: ${JSON.stringify(data)}`)
    } catch (error) {
      alert(`Login error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">6FB AI Agent System - Integration Test</h1>
        
        {/* Current Auth Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
          <div className="space-y-2">
            <div>User: {user ? user.email : 'Not logged in'}</div>
            <div>Profile: {profile ? `${profile.full_name || 'No name'} (${profile.role})` : 'No profile'}</div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Service Status</h2>
          {loading ? (
            <div>Checking services...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(status).map(([service, info]) => (
                <div key={service} className="border-l-4 border-gray-200 pl-4">
                  <div className="font-medium">{service}</div>
                  <pre className="text-sm text-gray-600 mt-1">
                    {JSON.stringify(info, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={checkAllServices}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Status
          </button>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={testSignUp}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Sign Up
            </button>
            <button
              onClick={testLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Login
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Go to Login Page
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}