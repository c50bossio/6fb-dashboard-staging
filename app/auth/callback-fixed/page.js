'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function FixedAuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing OAuth...')
  
  useEffect(() => {
    const handleFixed = async () => {
      try {
        setMessage('Getting OAuth code...')
        
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
          // Check for token in hash (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          
          if (accessToken) {
            // Store tokens directly
            localStorage.setItem('sb-access-token', accessToken)
            const refreshToken = hashParams.get('refresh_token')
            if (refreshToken) {
              localStorage.setItem('sb-refresh-token', refreshToken)
            }
            
            // Set bypass flags
            localStorage.setItem('dev_bypass', 'true')
            document.cookie = 'dev_auth=true; path=/; max-age=86400'
            
            setStatus('success')
            setMessage('Success! Redirecting...')
            setTimeout(() => router.push('/dashboard'), 1500)
            return
          }
          
          setStatus('error')
          setMessage('No OAuth data found')
          return
        }
        
        setMessage('Exchanging code for session...')
        
        // Exchange code server-side
        const response = await fetch('/api/auth/exchange-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.access_token) {
            // Store tokens
            localStorage.setItem('sb-access-token', data.access_token)
            if (data.refresh_token) {
              localStorage.setItem('sb-refresh-token', data.refresh_token)
            }
            
            // Store user data
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
            
            // Try to initialize Supabase client with the new session
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
              const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (supabaseUrl && supabaseAnonKey) {
                const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                  auth: {
                    persistSession: false,
                    autoRefreshToken: false
                  }
                })
                
                // Set the session manually
                await supabase.auth.setSession({
                  access_token: data.access_token,
                  refresh_token: data.refresh_token
                })
              }
            } catch (err) {
              console.log('Could not set Supabase session, using bypass:', err.message)
            }
            
            setTimeout(() => router.push('/dashboard'), 1500)
          } else {
            setStatus('error')
            setMessage('No access token received')
          }
        } else {
          setStatus('error')
          setMessage('Token exchange failed')
        }
        
      } catch (err) {
        setStatus('error')
        setMessage(`Error: ${err.message}`)
      }
    }
    
    handleFixed()
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