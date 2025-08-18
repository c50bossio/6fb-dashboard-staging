'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ManualAuthCallback() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('processing')
  
  const addLog = (message, data = null) => {
    console.log(message, data)
    setLogs(prev => [...prev, { message, data }])
  }
  
  useEffect(() => {
    const handleManualCallback = async () => {
      addLog('🚀 Manual OAuth callback started')
      
      try {
        // Get the code from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        
        if (error) {
          addLog('❌ OAuth error', { error, description: urlParams.get('error_description') })
          setStatus('error')
          return
        }
        
        if (!code) {
          addLog('❌ No code in URL')
          setStatus('error')
          return
        }
        
        addLog('✅ Code found', code.substring(0, 10) + '...')
        
        // Exchange code for session using our API endpoint
        addLog('Calling server-side exchange endpoint...')
        const response = await fetch('/api/auth/test-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code })
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          addLog('✅ Session created successfully!')
          addLog('User', { id: data.user?.id, email: data.user?.email })
          setStatus('success')
          
          // Store session in localStorage as a fallback
          if (data.session) {
            localStorage.setItem('sb-session', JSON.stringify(data.session))
          }
          
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          addLog('❌ Exchange failed', data)
          setStatus('error')
        }
        
      } catch (error) {
        addLog('❌ Unexpected error', error.message)
        setStatus('error')
      }
    }
    
    handleManualCallback()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Manual OAuth Callback</h1>
        <p className="text-gray-400 mb-6">This bypasses the Supabase SDK entirely and exchanges the code manually</p>
        
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <div className="flex items-center gap-3">
            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Processing OAuth manually...</span>
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
          <h2 className="text-lg font-semibold mb-3">Logs:</h2>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="border-b border-gray-700 pb-2">
                <div className="text-white">{log.message}</div>
                {log.data && (
                  <pre className="text-gray-300 text-xs mt-1 overflow-x-auto">
                    {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
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