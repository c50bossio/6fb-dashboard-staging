'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GoogleDirectAuth() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()
  
  const handleGoogleOAuth = () => {
    // Direct redirect to Google OAuth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const redirectTo = `${window.location.origin}/auth/callback-server`
    
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
    
    window.location.href = oauthUrl
  }
  
  const handleMagicLink = async () => {
    if (!email) {
      setMessage('Please enter your email')
      return
    }
    
    setStatus('sending')
    setMessage('Sending magic link...')
    
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setMessage('Check your email for the login link!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send magic link')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }
  
  const handleDevBypass = () => {
    // Set all bypass flags
    localStorage.setItem('dev_bypass', 'true')
    localStorage.setItem('dev_session', JSON.stringify({
      user: { email: 'dev@bookedbarber.com', id: 'dev-user' },
      access_token: 'dev-token'
    }))
    document.cookie = 'dev_auth=true; path=/; max-age=86400'
    
    router.push('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">Sign In</h2>
          <p className="mt-2 text-center text-gray-400">
            Multiple authentication options available
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Google OAuth */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Option 1: Google Sign-In</h3>
            <button
              onClick={handleGoogleOAuth}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
          
          {/* Magic Link */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Option 2: Magic Link</h3>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleMagicLink}
              disabled={status === 'sending'}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
            </button>
            {message && (
              <p className={`mt-2 text-sm ${
                status === 'success' ? 'text-green-400' : 
                status === 'error' ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {message}
              </p>
            )}
          </div>
          
          {/* Dev Bypass */}
          <div className="p-6 bg-gray-800 rounded-lg border border-yellow-600">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Option 3: Dev Bypass</h3>
            <p className="text-sm text-gray-400 mb-4">
              Skip authentication and go directly to dashboard (development only)
            </p>
            <button
              onClick={handleDevBypass}
              className="w-full px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Enter Dashboard (Dev Mode)
            </button>
          </div>
        </div>
        
        <div className="text-center text-gray-400 text-sm">
          <a href="/test-oauth-v2" className="hover:text-white">
            View all OAuth test options →
          </a>
        </div>
      </div>
    </div>
  )
}