'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { useAuth } from '../../components/SupabaseAuthProvider'

export default function TestAuthPage() {
  const { user, profile, loading, signIn, signOut } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loginForm, setLoginForm] = useState({ email: 'demo@barbershop.com', password: 'demo123' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [{
      time: timestamp,
      message,
      type
    }, ...prev])
  }

  useEffect(() => {
    addLog('🎬 Test page mounted', 'info')
    addLog(`Initial state - User: ${user?.email || 'None'}, Loading: ${loading}`, 'info')
    
    return () => {
      addLog('🏁 Test page unmounting', 'info')
    }
  }, [])

  useEffect(() => {
    addLog(`Auth state changed - User: ${user?.email || 'None'}, Loading: ${loading}`, 'info')
  }, [user, loading])

  const handleLogin = async () => {
    addLog('🚀 Starting login...', 'info')
    setIsSubmitting(true)
    
    try {
      addLog('📞 Calling signIn...', 'info')
      const result = await signIn({
        email: loginForm.email,
        password: loginForm.password
      })
      
      addLog('✅ SignIn returned successfully', 'success')
      addLog(`Result: ${JSON.stringify(result?.user?.email)}`, 'success')
      
      // Wait a bit to see if redirect happens
      setTimeout(() => {
        addLog(`Still on page after 2s - Path: ${window.location.pathname}`, 'warning')
      }, 2000)
      
    } catch (error) {
      addLog(`❌ Login error: ${error.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      addLog('✅ Signed out', 'success')
    } catch (error) {
      addLog(`❌ Sign out error: ${error.message}`, 'error')
    }
  }

  const checkAuthAPI = async () => {
    try {
      const res = await fetch('/api/debug-auth')
      const data = await res.json()
      addLog(`API Auth Check: ${JSON.stringify(data)}`, 'info')
    } catch (error) {
      addLog(`❌ API check error: ${error.message}`, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Flow Test Page</h1>
        
        {/* Current State */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}</p>
            <p><strong>User:</strong> {user?.email || '❌ None'}</p>
            <p><strong>Profile:</strong> {profile?.full_name || '❌ None'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          {!user ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <button
                onClick={handleLogin}
                disabled={isSubmitting || loading}
                className="bg-olive-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isSubmitting ? 'Logging in...' : 'Test Login'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Sign Out
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 text-white px-4 py-2 rounded ml-2"
              >
                Go to Dashboard
              </button>
            </div>
          )}
          
          <button
            onClick={checkAuthAPI}
            className="bg-gray-600 text-white px-4 py-2 rounded mt-4"
          >
            Check Auth API
          </button>
        </div>

        {/* Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-sm font-mono p-2 rounded ${
                  log.type === 'error' ? 'bg-red-100 text-red-800' :
                  log.type === 'success' ? 'bg-green-100 text-green-800' :
                  log.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                [{log.time}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}