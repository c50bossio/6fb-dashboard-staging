'use client'

import { useState } from 'react'

export default function ApiLoginPage() {
  const [email, setEmail] = useState('demo@barbershop.com')
  const [password, setPassword] = useState('demo123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Success! Force redirect
      console.log('Login successful via API, redirecting...')
      window.location.href = '/dashboard'
      
    } catch (err) {
      console.error('API login error:', err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6">API-Based Login</h2>
        <p className="text-sm text-gray-600 mb-4">
          This uses the API endpoint directly, bypassing React state issues
        </p>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded mb-4"
            required
            disabled={isLoading}
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded mb-4"
            required
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login via API'}
          </button>
        </form>
        
        <div className="mt-4 space-y-2">
          <a href="/login" className="block text-center text-blue-600 hover:underline">
            Back to regular login
          </a>
          <a href="/login-simple" className="block text-center text-blue-600 hover:underline">
            Try simple login
          </a>
        </div>
      </div>
    </div>
  )
}