'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/UNIFIED_CLIENT'
import { useAuth } from './SupabaseAuthProvider'

export default function AuthDebugger() {
  const [debugInfo, setDebugInfo] = useState([])
  const [testResults, setTestResults] = useState({})

  // Get auth context
  let authContext = null
  try {
    authContext = useAuth()
  } catch (error) {
    setDebugInfo(prev => [...prev, `❌ Auth Context Error: ${error.message}`])
  }

  useEffect(() => {
    const runDiagnostics = async () => {
      const results = {}
      const info = []

      info.push('🔍 Starting Auth Diagnostics...')

      // Test 1: Environment Variables
      info.push('📋 Checking environment variables...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      results.envVars = {
        url: !!supabaseUrl,
        key: !!supabaseKey,
        urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Missing'
      }
      info.push(`   URL: ${results.envVars.url ? '✅' : '❌'} ${results.envVars.urlValue}`)
      info.push(`   Key: ${results.envVars.key ? '✅' : '❌'} ${supabaseKey ? 'Present' : 'Missing'}`)

      // Test 2: Supabase Client Creation
      info.push('🔧 Testing Supabase client creation...')
      try {
        const client = createClient()
        results.clientCreation = { success: true, error: null }
        info.push('   ✅ Supabase client created successfully')

        // Test 3: Auth Session Check
        info.push('🔐 Testing auth session...')
        try {
          const { data: { session }, error } = await client.auth.getSession()
          results.sessionCheck = { 
            success: true, 
            hasSession: !!session,
            hasUser: !!session?.user,
            error: error?.message || null
          }
          info.push(`   Session: ${session ? '✅ Found' : '❌ None'}`)
          info.push(`   User: ${session?.user ? '✅ Found' : '❌ None'}`)
          if (error) info.push(`   Error: ${error.message}`)
        } catch (sessionError) {
          results.sessionCheck = { success: false, error: sessionError.message }
          info.push(`   ❌ Session check failed: ${sessionError.message}`)
        }
      } catch (clientError) {
        results.clientCreation = { success: false, error: clientError.message }
        info.push(`   ❌ Client creation failed: ${clientError.message}`)
      }

      // Test 4: Auth Context Values
      if (authContext) {
        info.push('🎯 Auth Context Values:')
        info.push(`   Loading: ${authContext.loading}`)
        info.push(`   User: ${authContext.user ? '✅ Present' : '❌ None'}`)
        info.push(`   Profile: ${authContext.profile ? '✅ Present' : '❌ None'}`)
      }

      setTestResults(results)
      setDebugInfo(info)
    }

    runDiagnostics()
  }, [authContext])

  return (
    <div className="fixed top-4 left-4 bg-black text-green-400 p-4 rounded-lg max-w-md max-h-96 overflow-y-auto z-50 text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-yellow-400 font-bold">AUTH DIAGNOSTICS</h3>
      </div>
      
      {debugInfo.map((info, index) => (
        <div key={index} className="mb-1">
          {info}
        </div>
      ))}

      {authContext && (
        <div className="mt-4 pt-2 border-t border-gray-600">
          <div className="text-yellow-400">Current State:</div>
          <div>Loading: <span className={authContext.loading ? 'text-red-400' : 'text-green-400'}>{String(authContext.loading)}</span></div>
          <div>User ID: {authContext.user?.id || 'none'}</div>
          <div>Profile ID: {authContext.profile?.id || 'none'}</div>
        </div>
      )}
    </div>
  )
}