'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function WorkingLoginPage() {
  const [formData, setFormData] = useState({
    email: 'demo@barbershop.com',
    password: 'demo123'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('Signing in...')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setMessage('Login successful! Redirecting...')
      
      const form = document.createElement('form')
      form.method = 'GET'
      form.action = '/dashboard-simple'
      document.body.appendChild(form)
      form.submit()
      
    } catch (err) {
      setMessage(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Working Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Email"
              className="w-full p-3 border rounded"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Password"
              className="w-full p-3 border rounded"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-olive-600 text-white p-3 rounded hover:bg-olive-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-4 p-3 rounded text-center ${
            message.includes('successful') ? 'bg-moss-100 text-moss-800' : 'bg-softred-100 text-softred-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>This login uses the simple dashboard that works</p>
          <Link href="/" className="text-olive-600 hover:underline mt-2 block">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}