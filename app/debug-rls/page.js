'use client'

export default function DebugRLSPage() {
  const handleTestRLS = async () => {
    console.log('🔍 Starting RLS debug test...')
    
    try {
      // Step 1: Test environment variables
      const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log('📊 Environment check:', {
        url: envUrl ? 'SET' : 'MISSING',
        key: envKey ? 'SET' : 'MISSING'
      })
      
      if (!envUrl || !envKey) {
        console.error('❌ Environment variables missing')
        return
      }
      
      // Step 2: Test browser client import
      console.log('📦 Importing browser client...')
      const { createClient } = await import('@/lib/supabase/browser-client')
      console.log('✅ Browser client imported:', typeof createClient)
      
      // Step 3: Create client
      console.log('🔧 Creating Supabase client...')
      const supabase = createClient()
      console.log('✅ Client created:', {
        exists: !!supabase,
        hasFrom: typeof supabase.from === 'function'
      })
      
      if (!supabase || typeof supabase.from !== 'function') {
        console.error('❌ Supabase client invalid')
        return
      }
      
      // Step 4: Test query builder
      console.log('🏗️ Creating query builder...')
      const query = supabase.from('profiles')
      console.log('✅ Query builder created:', {
        exists: !!query,
        hasSelect: typeof query.select === 'function',
        hasEq: typeof query.eq === 'function'
      })
      
      if (!query || typeof query.eq !== 'function') {
        console.error('❌ Query builder invalid')
        return
      }
      
      // Step 5: Test RLS manager import
      console.log('📦 Importing RLS manager...')
      const { createShopScopedQuery } = await import('@/lib/rls-context-manager')
      console.log('✅ RLS manager imported:', typeof createShopScopedQuery)
      
      // Step 6: Test RLS manager
      console.log('🎯 Testing RLS manager...')
      const mockContext = {
        userId: 'test-user',
        shopId: 'test-shop',
        role: 'shop_owner',
        permissions: []
      }
      
      const rlsQuery = createShopScopedQuery('appointments', mockContext)
      console.log('✅ RLS query created:', {
        exists: !!rlsQuery,
        hasSelect: typeof rlsQuery?.select === 'function',
        hasEq: typeof rlsQuery?.eq === 'function'
      })
      
      if (rlsQuery && typeof rlsQuery.eq === 'function') {
        console.log('🎉 SUCCESS: All tests passed!')
        document.getElementById('result').textContent = '✅ All tests passed! RLS manager is working.'
      } else {
        console.error('❌ RLS query builder failed')
        document.getElementById('result').textContent = '❌ RLS query builder failed'
      }
      
    } catch (error) {
      console.error('❌ Debug test error:', error)
      document.getElementById('result').textContent = `❌ Error: ${error.message}`
    }
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">RLS Debug Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <button 
            onClick={handleTestRLS}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Run RLS Debug Test
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Test Result</h2>
          <p id="result" className="text-gray-700">Click the button to run the test</p>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This page runs step-by-step debugging of the RLS manager.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  )
}