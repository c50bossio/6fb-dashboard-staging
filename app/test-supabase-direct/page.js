'use client'

import { useEffect, useState } from 'react'

export default function TestSupabaseDirectPage() {
  const [result, setResult] = useState('Testing...')
  
  useEffect(() => {
    async function testSupabaseDirect() {
      try {
        console.log('🧪 Testing Supabase client creation directly...')
        
        // Test environment variables first
        const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        console.log('📊 Environment variables:', {
          url: envUrl ? envUrl.substring(0, 30) + '...' : 'NOT SET',
          keyLength: envKey ? envKey.length : 'NOT SET'
        })
        
        if (!envUrl || !envKey) {
          setResult('❌ Environment variables not set')
          return
        }

        // Try to create Supabase client directly using the same method as the browser client
        const { createBrowserClient } = await import('@supabase/ssr')
        
        console.log('📊 createBrowserClient imported:', typeof createBrowserClient)
        
        const supabase = createBrowserClient(envUrl, envKey, {
          cookies: {
            get(name) {
              if (typeof document === 'undefined') return null
              
              const value = document.cookie
                .split(';')
                .find(row => row.trim().startsWith(`${name}=`))
                ?.split('=')[1]
              
              return value ? decodeURIComponent(value) : null
            },
            getAll() {
              if (typeof document === 'undefined') return []
              
              return document.cookie
                .split(';')
                .map(cookie => {
                  const [name, ...rest] = cookie.trim().split('=')
                  return {
                    name,
                    value: rest.length > 0 ? decodeURIComponent(rest.join('=')) : ''
                  }
                })
                .filter(cookie => cookie.name)
            },
            setAll(cookiesToSet) {
              if (typeof document === 'undefined') return
              
              cookiesToSet.forEach(({ name, value, options = {} }) => {
                const cookieOptions = {
                  path: '/',
                  sameSite: 'Lax',
                  secure: window.location.protocol === 'https:',
                  maxAge: options.maxAge || 60 * 60 * 24 * 7,
                  ...options
                }
                
                const cookieString = [
                  `${name}=${encodeURIComponent(value)}`,
                  `Path=${cookieOptions.path}`,
                  `SameSite=${cookieOptions.sameSite}`,
                  cookieOptions.secure ? 'Secure' : '',
                  cookieOptions.maxAge ? `Max-Age=${cookieOptions.maxAge}` : ''
                ].filter(Boolean).join('; ')
                
                document.cookie = cookieString
              })
            }
          }
        })
        
        console.log('📊 Supabase client created:', {
          clientExists: !!supabase,
          clientType: typeof supabase,
          hasFromMethod: typeof supabase.from === 'function',
          clientConstructor: supabase?.constructor?.name,
          clientKeys: supabase ? Object.keys(supabase).slice(0, 10) : []
        })
        
        if (!supabase) {
          setResult('❌ Supabase client is null')
          return
        }
        
        if (typeof supabase.from !== 'function') {
          setResult('❌ Supabase client missing from() method')
          return
        }
        
        // Test creating a query builder
        let query
        try {
          query = supabase.from('profiles')
          console.log('📊 Query builder test:', {
            queryExists: !!query,
            queryType: typeof query,
            queryConstructor: query?.constructor?.name,
            hasSelectMethod: typeof query?.select === 'function',
            hasEqMethod: typeof query?.eq === 'function',
            queryKeys: query ? Object.keys(query).slice(0, 10) : []
          })
        } catch (error) {
          console.error('❌ Error creating query builder:', error)
          setResult(`❌ Error creating query builder: ${error.message}`)
          return
        }
        
        if (!query) {
          setResult('❌ Query builder is null')
          return
        }
        
        if (typeof query.select !== 'function') {
          setResult('❌ Query builder missing select() method')
          return
        }
        
        // Test a simple query
        try {
          const { data, error } = await query.select('id').limit(1)
          
          console.log('📊 Test query result:', {
            hasData: !!data,
            dataLength: data ? data.length : 0,
            hasError: !!error,
            errorMessage: error?.message
          })
          
          if (error) {
            setResult(`❌ Query error: ${error.message}`)
            return
          }
          
          setResult('✅ Supabase client is working! Query executed successfully.')
          
        } catch (queryError) {
          console.error('❌ Query execution error:', queryError)
          setResult(`❌ Query execution error: ${queryError.message}`)
          return
        }
        
      } catch (error) {
        console.error('❌ Test Error:', error)
        setResult(`❌ Error: ${error.message}\n\nStack trace:\n${error.stack}`)
      }
    }
    
    testSupabaseDirect()
  }, [])
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Direct Supabase Client Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Test Result</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{result}</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This page tests Supabase client creation directly without the RLS manager.</p>
          <p>If you see a success message above, the Supabase client works.</p>
        </div>
      </div>
    </div>
  )
}