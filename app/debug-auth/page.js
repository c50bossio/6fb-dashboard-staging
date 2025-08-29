'use client'

import { useState, useEffect } from 'react'

export default function DebugAuth() {
  const [results, setResults] = useState({})
  const [testing, setTesting] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      const testResults = {}
      
      // Test 1: Check environment variables
      testResults.envVars = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }
      
      // Test 2: Try to import Supabase
      try {
        const { createBrowserClient } = await import('@supabase/ssr')
        testResults.importSuccess = true
        
        // Test 3: Try to create client
        try {
          const client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          )
          testResults.clientCreated = true
          
          // Test 4: Try to call getSession with timeout
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
            )
            
            const sessionPromise = client.auth.getSession()
            
            const result = await Promise.race([sessionPromise, timeoutPromise])
            testResults.sessionResponse = {
              success: true,
              hasSession: !!result?.data?.session,
              error: result?.error?.message || null
            }
          } catch (sessionError) {
            testResults.sessionResponse = {
              success: false,
              error: sessionError.message
            }
          }
          
        } catch (clientError) {
          testResults.clientCreated = false
          testResults.clientError = clientError.message
        }
        
      } catch (importError) {
        testResults.importSuccess = false
        testResults.importError = importError.message
      }
      
      // Test 5: Check if we can reach Supabase URL
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json'
          }
        })
        testResults.healthCheck = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        }
      } catch (fetchError) {
        testResults.healthCheck = {
          error: fetchError.message
        }
      }
      
      setResults(testResults)
      setTesting(false)
    }
    
    runTests()
  }, [])

  if (testing) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Running Authentication Diagnostics...</h1>
        <div className="animate-pulse">Please wait...</div>
      </div>
    )
  }

  return (
    <div className="p-8 font-mono">
      <h1 className="text-2xl font-bold mb-6">🔍 Authentication Debug Report</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">1. Environment Variables</h2>
          <pre className="text-sm">{JSON.stringify(results.envVars, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">2. Supabase Import</h2>
          <p>Success: {results.importSuccess ? '✅' : '❌'}</p>
          {results.importError && <p className="text-red-600">Error: {results.importError}</p>}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">3. Client Creation</h2>
          <p>Success: {results.clientCreated ? '✅' : '❌'}</p>
          {results.clientError && <p className="text-red-600">Error: {results.clientError}</p>}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">4. Session Check</h2>
          <pre className="text-sm">{JSON.stringify(results.sessionResponse, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">5. Health Check</h2>
          <pre className="text-sm">{JSON.stringify(results.healthCheck, null, 2)}</pre>
        </div>
      </div>
      
      <div className="mt-8 space-y-2">
        <h2 className="font-bold">Quick Actions:</h2>
        <a href="/test-auth" className="inline-block bg-blue-500 text-white px-4 py-2 rounded mr-2">Test Auth Page</a>
        <a href="/test-simple-auth" className="inline-block bg-green-500 text-white px-4 py-2 rounded mr-2">Simple Auth Test</a>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Retry Tests
        </button>
      </div>
    </div>
  )
}