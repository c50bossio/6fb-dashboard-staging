'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function CoreAuthCallback() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('processing')
  
  const addLog = (message) => {
    console.log(message)
    setLogs(prev => [...prev, message])
  }
  
  useEffect(() => {
    const handleCallback = async () => {
      addLog('Starting core Supabase client test...')
      
      try {
        // Get environment variables directly
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        addLog(`URL: ${supabaseUrl?.substring(0, 30)}...`)
        addLog(`Key: ${supabaseAnonKey?.substring(0, 30)}...`)
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing environment variables')
        }
        
        // Create the most basic Supabase client possible
        addLog('Creating basic Supabase client...')
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        })
        
        addLog('Client created, checking session...')
        
        // Try to get session with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
        )
        
        try {
          const result = await Promise.race([
            sessionPromise,
            timeoutPromise
          ])
          
          addLog(`Session result: ${JSON.stringify({
            hasData: !!result?.data,
            hasSession: !!result?.data?.session,
            hasUser: !!result?.data?.session?.user,
            error: result?.error?.message
          })}`)
          
          if (result?.data?.session) {
            setStatus('success')
            addLog('✅ Session found! Redirecting...')
            setTimeout(() => router.push('/dashboard'), 2000)
          } else {
            setStatus('error')
            addLog('❌ No session found')
          }
        } catch (timeoutError) {
          setStatus('error')
          addLog(`⏱️ Session check timed out: ${timeoutError.message}`)
          addLog('This suggests the Supabase client is hanging')
        }
      } catch (error) {
        setStatus('error')
        addLog(`❌ Error: ${error.message}`)
      }
    }
    
    handleCallback()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Core Supabase Client Test</h1>
        
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <div className="flex items-center gap-3">
            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Testing core Supabase client...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <span className="text-green-500">✅</span>
                <span>Success! Redirecting...</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="text-red-500">❌</span>
                <span>Test failed. Check logs below.</span>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Logs:</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300">
                {log}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Retry
          </button>
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