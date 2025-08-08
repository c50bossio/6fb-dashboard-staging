'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDevLogin = () => {
    setLoading(true)
    
    // Set development session in localStorage
    const devSession = {
      user: {
        id: 'dev-user-001',
        email: 'dev@6fb-ai.com',
        name: 'Development User',
        role: 'SHOP_OWNER'
      },
      profile: {
        shop_id: 'demo-shop-001',
        shop_name: 'Demo Barbershop'
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }
    
    // Store in multiple places for persistence
    localStorage.setItem('dev_session', JSON.stringify(devSession))
    sessionStorage.setItem('dev_session', JSON.stringify(devSession))
    
    // Set a cookie as well
    document.cookie = `dev_auth=true; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
    
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Development Login</h1>
          <p className="text-sm text-gray-600 mt-2">
            Skip authentication for development testing
          </p>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            ⚠️ This bypasses authentication for development only. 
            Do not use in production.
          </p>
        </div>
        
        <button
          onClick={handleDevLogin}
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Setting up session...' : 'Continue as Developer'}
        </button>
        
        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            Use regular login →
          </a>
        </div>
      </div>
    </div>
  )
}