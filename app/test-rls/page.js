'use client'

import { useEffect, useState } from 'react'
import { createShopScopedQuery } from '@/lib/rls-context-manager'

export default function TestRLSPage() {
  const [result, setResult] = useState('Testing...')
  
  useEffect(() => {
    async function testRLS() {
      try {
        // Mock context for testing
        const mockContext = {
          userId: 'test-user',
          barbershopId: 'test-shop',
          role: 'shop_owner',
          permissions: []
        }
        
        console.log('🧪 Testing RLS Context Manager...')
        
        // First, test if we can create a Supabase client directly
        const { createClient } = await import('@/lib/supabase/UNIFIED_CLIENT')
        const supabase = createClient()
        
        console.log('📊 Supabase client details:', {
          clientExists: !!supabase,
          clientType: typeof supabase,
          hasFromMethod: typeof supabase?.from === 'function',
          envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          envKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
        })
        
        if (supabase && typeof supabase.from === 'function') {
          const directQuery = supabase.from('appointments')
          console.log('📊 Direct query test:', {
            queryExists: !!directQuery,
            queryType: typeof directQuery,
            hasEqMethod: typeof directQuery?.eq === 'function'
          })
        }
        
        // Now test the RLS Context Manager
        const query = createShopScopedQuery('appointments', mockContext)
        
        console.log('📊 RLS query details:', {
          queryExists: !!query,
          queryType: typeof query,
          hasEqMethod: typeof query?.eq === 'function'
        })
        
        if (query && typeof query.eq === 'function') {
          console.log('✅ Success: Query builder created successfully')
          setResult('✅ RLS Context Manager is working! Query builder created successfully.')
        } else {
          console.log('❌ Failed: Query is null or missing methods')
          setResult(`❌ RLS Context Manager failed: Query is null or missing methods\n\nDebug info:\n- Query exists: ${!!query}\n- Query type: ${typeof query}\n- Has eq method: ${typeof query?.eq === 'function'}`)
        }
      } catch (error) {
        console.error('❌ RLS Test Error:', error)
        setResult(`❌ Error: ${error.message}\n\nStack trace:\n${error.stack}`)
      }
    }
    
    testRLS()
  }, [])
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">RLS Context Manager Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Test Result</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{result}</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This page tests the RLS Context Manager fix.</p>
          <p>If you see a success message above, the fix is working correctly.</p>
        </div>
      </div>
    </div>
  )
}