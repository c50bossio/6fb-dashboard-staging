'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState({})
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session) {
        setSession(session)
      }
      
      if (sessionError) {
        setError(sessionError.message)
      }
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const errorParam = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      
      setDebugInfo({
        url: window.location.href,
        origin: window.location.origin,
        search: window.location.search,
        code: code ? `${code.substring(0, 20)}...` : null,
        error: errorParam,
        errorDescription: errorDescription,
        hasSession: !!session,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        cookies: document.cookie.split(';').map(c => {
          const [name] = c.trim().split('=')
          return name
        }).filter(n => n.includes('sb-'))
      })
    }
    
    checkAuth()
  }, [])
  
  const testOAuth = async () => {
    const supabase = createClient()
    
    // This will show us exactly what URL Supabase generates
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true // Don't redirect, just get the URL
      }
    })
    
    if (data?.url) {
      setDebugInfo(prev => ({
        ...prev,
        generatedOAuthUrl: data.url,
        decodedUrl: decodeURIComponent(data.url)
      }))
      
      // Now actually redirect
      window.location.href = data.url
    }
    
    if (error) {
      setError(error.message)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">OAuth Debug Information</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
            <h2 className="font-semibold text-red-700">Error:</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {session && (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
            <h2 className="font-semibold text-green-700">Session Active!</h2>
            <p className="text-green-600">User: {session.user?.email}</p>
            <p className="text-green-600">Provider: {session.user?.app_metadata?.provider}</p>
          </div>
        )}
        
        <div className="bg-white rounded shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white rounded shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test OAuth Flow</h2>
          <button
            onClick={testOAuth}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Test Google OAuth (Debug Mode)
          </button>
          <p className="mt-2 text-sm text-gray-600">
            This will generate the OAuth URL and show it before redirecting
          </p>
        </div>
        
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expected Flow</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>User clicks OAuth button at bookedbarber.com</li>
            <li>Redirects to dfhqjdoydihajmjxniee.supabase.co/auth/v1/authorize</li>
            <li>Supabase redirects to accounts.google.com</li>
            <li>User authenticates with Google</li>
            <li>Google redirects to dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback</li>
            <li>Supabase processes and redirects to bookedbarber.com/auth/callback?code=XXX</li>
            <li>Our callback exchanges code for session</li>
            <li>User is logged in and redirected to dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  )
}