'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function DebugAuthCallback() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('processing')
  
  const addLog = (message, data = null) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`, data || '')
    setLogs(prev => [...prev, { timestamp, message, data }])
  }
  
  useEffect(() => {
    const debugCallback = async () => {
      addLog('🚀 Debug callback started')
      
      try {
        // Log current URL
        addLog('Current URL', window.location.href)
        
        // Parse parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        // Log all parameters
        const allParams = {}
        for (const [key, value] of searchParams) {
          allParams[key] = value.substring(0, 20) + (value.length > 20 ? '...' : '')
        }
        for (const [key, value] of hashParams) {
          allParams[`#${key}`] = value.substring(0, 20) + (value.length > 20 ? '...' : '')
        }
        addLog('URL Parameters', allParams)
        
        // Check for OAuth error
        const error = searchParams.get('error') || hashParams.get('error')
        if (error) {
          addLog('❌ OAuth Error', {
            error,
            description: searchParams.get('error_description') || hashParams.get('error_description')
          })
          setStatus('error')
          return
        }
        
        // Get Supabase client
        const supabase = createClient()
        addLog('Supabase client created')
        
        // Check current session BEFORE exchange with timeout
        addLog('Checking existing session...')
        try {
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getSession timeout after 3 seconds')), 3000)
          )
          
          const { data: { session: beforeSession }, error: beforeError } = await Promise.race([
            sessionPromise,
            timeoutPromise.then(() => ({ data: { session: null }, error: { message: 'Timeout - Supabase not responding' } }))
          ])
          
          addLog('Session before exchange', {
            hasSession: !!beforeSession,
            hasUser: !!beforeSession?.user,
            userId: beforeSession?.user?.id,
            email: beforeSession?.user?.email,
            error: beforeError?.message
          })
        } catch (sessionError) {
          addLog('❌ Session check timed out', {
            error: sessionError.message,
            note: 'Supabase client may be misconfigured or network issue'
          })
          var beforeSession = null
          var beforeError = { message: 'Session check timed out' }
        }
        
        if (beforeSession?.user) {
          addLog('✅ Already have session, redirecting...')
          setStatus('success')
          setTimeout(() => router.push('/dashboard'), 2000)
          return
        }
        
        // Get code
        const code = searchParams.get('code')
        if (!code) {
          addLog('⚠️ No code in URL')
          
          // Check for access_token in hash (implicit flow)
          const accessToken = hashParams.get('access_token')
          if (accessToken) {
            addLog('Found access_token in hash', { hasToken: true })
            // Wait for Supabase to process
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const { data: { session: hashSession } } = await supabase.auth.getSession()
            if (hashSession?.user) {
              addLog('✅ Session from hash token')
              setStatus('success')
              setTimeout(() => router.push('/dashboard'), 2000)
              return
            }
          }
          
          addLog('❌ No authentication data found')
          setStatus('error')
          return
        }
        
        addLog('Code found', { code: code.substring(0, 10) + '...' })
        
        // Try exchange with timeout
        addLog('Starting code exchange...')
        const exchangePromise = supabase.auth.exchangeCodeForSession(code)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Exchange timeout')), 5000)
        )
        
        try {
          const { data, error: exchangeError } = await Promise.race([
            exchangePromise,
            timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout after 5 seconds' } }))
          ])
          
          addLog('Exchange completed', {
            hasData: !!data,
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
            error: exchangeError?.message
          })
          
          if (exchangeError) {
            addLog('❌ Exchange error', exchangeError)
            
            // Check session anyway
            const { data: { session: errorSession } } = await supabase.auth.getSession()
            if (errorSession?.user) {
              addLog('✅ Found session despite error')
              setStatus('success')
              setTimeout(() => router.push('/dashboard'), 2000)
              return
            }
            
            setStatus('error')
            return
          }
          
          if (data?.session?.user) {
            addLog('✅ Session created!', {
              userId: data.session.user.id,
              email: data.session.user.email
            })
            setStatus('success')
            setTimeout(() => router.push('/dashboard'), 2000)
            return
          }
          
        } catch (timeoutError) {
          addLog('⏱️ Exchange timed out', timeoutError.message)
          
          // Final session check
          const { data: { session: finalSession } } = await supabase.auth.getSession()
          if (finalSession?.user) {
            addLog('✅ Session found after timeout')
            setStatus('success')
            setTimeout(() => router.push('/dashboard'), 2000)
            return
          }
        }
        
        addLog('❌ Failed to establish session')
        setStatus('error')
        
      } catch (error) {
        addLog('❌ Unexpected error', {
          message: error.message,
          stack: error.stack
        })
        setStatus('error')
      }
    }
    
    debugCallback()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">OAuth Debug Callback</h1>
        
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <div className="flex items-center gap-3">
            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Processing OAuth callback...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <span className="text-green-500">✅</span>
                <span>Success! Redirecting to dashboard...</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="text-red-500">❌</span>
                <span>Authentication failed. Check logs below.</span>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Debug Logs:</h2>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-700 pb-2">
                <div className="text-gray-400">{log.timestamp}</div>
                <div className="text-white">{log.message}</div>
                {log.data && (
                  <pre className="text-gray-300 text-xs mt-1 overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}