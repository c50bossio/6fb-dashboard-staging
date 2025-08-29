'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export default function TestSessionClientPage() {
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cookies, setCookies] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Client-side session check...')
        console.log('🍪 Document cookies:', document.cookie)
        
        // Get all cookies for analysis
        setCookies(document.cookie)
        
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        console.log('📊 Getting session from client...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('📊 Client session result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        })
        
        if (error) {
          setError(error.message)
        } else {
          setSessionData(session)
        }
      } catch (err) {
        console.error('❌ Client auth check error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading client session test...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Client-Side Session Test</h1>
      
      <div className="grid gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Session Status</h2>
          <p><strong>Has Session:</strong> {sessionData ? 'Yes' : 'No'}</p>
          {sessionData && (
            <>
              <p><strong>User ID:</strong> {sessionData.user?.id}</p>
              <p><strong>Email:</strong> {sessionData.user?.email}</p>
              <p><strong>Provider:</strong> {sessionData.user?.app_metadata?.provider}</p>
            </>
          )}
          {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Raw Cookies</h2>
          <pre className="text-xs overflow-auto bg-white p-2 rounded">
            {cookies || 'No cookies found'}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Supabase Cookies Analysis</h2>
          <div className="text-sm">
            {cookies.split(';').map((cookie, index) => {
              const trimmed = cookie.trim()
              if (trimmed.startsWith('sb-')) {
                return (
                  <div key={index} className="mb-1">
                    <strong>{trimmed.split('=')[0]}:</strong> {trimmed.split('=')[1]?.substring(0, 50)}...
                  </div>
                )
              }
              return null
            }).filter(Boolean)}
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Full Session Data</h2>
          <pre className="text-xs overflow-auto bg-white p-2 rounded max-h-96">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}