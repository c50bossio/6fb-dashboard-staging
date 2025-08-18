'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ServerAuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing OAuth...')
  
  useEffect(() => {
    const handleServerCallback = async () => {
      try {
        // Get code from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        
        if (error) {
          setStatus('error')
          setMessage(`OAuth error: ${error}`)
          return
        }
        
        if (!code) {
          setStatus('error')
          setMessage('No authorization code found')
          return
        }
        
        setMessage('Exchanging code for session...')
        
        // Use the v2 endpoint that has better error handling
        const response = await fetch('/api/auth/exchange-code-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          setMessage('Success! Setting up session...')
          
          // Store tokens and user data
          if (data.access_token) {
            localStorage.setItem('sb-access-token', data.access_token)
          }
          if (data.refresh_token) {
            localStorage.setItem('sb-refresh-token', data.refresh_token)
          }
          if (data.user) {
            localStorage.setItem('sb-user', JSON.stringify(data.user))
          }
          
          // Set bypass flags for dashboard access
          localStorage.setItem('dev_bypass', 'true')
          localStorage.setItem('dev_session', JSON.stringify({
            user: data.user,
            access_token: data.access_token
          }))
          document.cookie = 'dev_auth=true; path=/; max-age=86400'
          
          setStatus('success')
          setMessage('Success! Redirecting to dashboard...')
          
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          setStatus('error')
          setMessage(data.error || 'Token exchange failed')
          console.error('Exchange error details:', data)
        }
        
      } catch (err) {
        setStatus('error')
        setMessage(`Error: ${err.message}`)
        console.error('Callback error:', err)
      }
    }
    
    handleServerCallback()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center p-8 bg-gray-800 rounded-lg max-w-md">
        <h1 className="text-2xl font-bold mb-4">Completing Sign In...</h1>
        
        <div className={`text-lg mb-4 ${
          status === 'error' ? 'text-red-500' : 
          status === 'success' ? 'text-green-500' : 
          'text-gray-300'
        }`}>
          {message}
        </div>
        
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        )}
        
        {status === 'success' && (
          <div className="text-green-500">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        )}
        
        {status === 'error' && (
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-4">
              Check the browser console for details
            </p>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}