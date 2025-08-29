'use client'

import { useState, useEffect } from 'react'

export default function AuthDebug() {
  const [status, setStatus] = useState('Initializing...')
  const [supabase, setSupabase] = useState(null)

  useEffect(() => {
    async function initSupabase() {
      try {
        setStatus('Loading Supabase...')
        
        const { createBrowserClient } = await import('@supabase/ssr')
        
        const client = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        setSupabase(client)
        setStatus('Supabase loaded successfully!')
        
        // Test connection
        const { data, error } = await client.auth.getSession()
        if (error) {
          setStatus(`Session error: ${error.message}`)
        } else {
          setStatus(`Connection OK! Session: ${data.session ? 'Logged in' : 'Not logged in'}`)
        }
        
      } catch (error) {
        setStatus(`Error: ${error.message}`)
        console.error('Supabase init error:', error)
      }
    }
    
    initSupabase()
  }, [])

  const testSignIn = async () => {
    if (!supabase) {
      setStatus('Supabase not initialized')
      return
    }

    try {
      setStatus('Testing sign in with timeout...')
      
      // Add a timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout after 10 seconds')), 10000)
      )
      
      const authPromise = supabase.auth.signInWithPassword({
        email: 'test@bookedbarber.com',
        password: 'testpass123'
      })
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise])
      
      if (error) {
        setStatus(`Sign in error: ${error.message}`)
        console.error('Sign in error:', error)
      } else {
        setStatus(`Sign in success! User: ${data.user?.email}`)
        console.log('Sign in success:', data)
      }
      
    } catch (error) {
      setStatus(`Exception: ${error.message}`)
      console.error('Sign in exception:', error)
    }
  }

  const testConnection = async () => {
    if (!supabase) {
      setStatus('Supabase not initialized')
      return
    }

    try {
      setStatus('Testing basic connection...')
      
      // Test a simple query instead of auth
      const { data, error } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1)
      
      if (error) {
        setStatus(`Connection error: ${error.message}`)
        console.error('Connection error:', error)
      } else {
        setStatus(`Connection OK! Can query database.`)
        console.log('Connection success:', data)
      }
      
    } catch (error) {
      setStatus(`Connection exception: ${error.message}`)
      console.error('Connection exception:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6">🔍 Authentication Debug</h1>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Status:</h3>
            <div className="p-3 bg-gray-50 rounded border">
              {status}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Environment Check:</h3>
            <div className="p-3 bg-gray-50 rounded border text-sm">
              <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={testConnection}
              disabled={!supabase}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Test Basic Connection
            </button>

            <button
              onClick={testSignIn}
              disabled={!supabase}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Test Sign In (with timeout)
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>This page tests the Supabase connection directly without complex UI.</p>
            <p>Check the browser console (F12) for detailed error messages.</p>
          </div>
        </div>
      </div>
    </div>
  )
}