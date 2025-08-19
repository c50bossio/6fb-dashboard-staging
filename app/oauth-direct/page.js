'use client'

import { useEffect } from 'react'

export default function OAuthDirect() {
  useEffect(() => {
    // Check URL for OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    
    if (code) {
      // We have OAuth code, exchange it
      fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Direct browser navigation
          window.location.href = '/dashboard'
        } else {
          console.error('Exchange failed:', data.error)
        }
      })
      .catch(err => console.error('Exchange error:', err))
    }
  }, [])
  
  const handleGoogleLogin = () => {
    // Direct OAuth URL construction
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const redirectUrl = `${window.location.origin}/oauth-direct`
    
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`
    
    // Direct browser navigation
    window.location.href = oauthUrl
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Direct OAuth Test</h1>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
        >
          Sign in with Google (Direct)
        </button>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Most direct OAuth approach - no libraries</p>
        </div>
      </div>
    </div>
  )
}