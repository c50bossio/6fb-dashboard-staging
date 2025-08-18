'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function StandaloneAuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing...')
  
  useEffect(() => {
    // This is a completely standalone OAuth handler
    // It doesn't use any Supabase client library at all
    
    const handleStandalone = async () => {
      try {
        // Check URL for OAuth response
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        // Check for error
        const error = searchParams.get('error') || hashParams.get('error')
        if (error) {
          setStatus('error')
          setMessage(`OAuth error: ${error}`)
          return
        }
        
        // Check for access token (implicit flow)
        const accessToken = hashParams.get('access_token')
        if (accessToken) {
          // Store token and redirect
          localStorage.setItem('sb-access-token', accessToken)
          const refreshToken = hashParams.get('refresh_token')
          if (refreshToken) {
            localStorage.setItem('sb-refresh-token', refreshToken)
          }
          
          setStatus('success')
          setMessage('Success! Token stored. Redirecting...')
          setTimeout(() => router.push('/dashboard'), 1500)
          return
        }
        
        // Check for code (PKCE flow)
        const code = searchParams.get('code')
        if (code) {
          setMessage('Code found, exchanging for token...')
          
          // Make a simple fetch request to exchange the code
          const response = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.access_token) {
              localStorage.setItem('sb-access-token', data.access_token)
              if (data.refresh_token) {
                localStorage.setItem('sb-refresh-token', data.refresh_token)
              }
              setStatus('success')
              setMessage('Success! Redirecting...')
              setTimeout(() => router.push('/dashboard'), 1500)
            } else {
              setStatus('error')
              setMessage('No token received from exchange')
            }
          } else {
            setStatus('error')
            setMessage('Token exchange failed')
          }
          return
        }
        
        // No OAuth data found
        setStatus('error')
        setMessage('No OAuth data in URL')
        
      } catch (err) {
        setStatus('error')
        setMessage(`Error: ${err.message}`)
      }
    }
    
    handleStandalone()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center p-8 bg-gray-800 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Standalone OAuth Handler</h1>
        <p className="text-sm text-gray-400 mb-6">No Supabase client library used</p>
        
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
        
        {status === 'error' && (
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}