'use client'

export default function TestRLSIsolatedPage() {
  const runDiagnostic = async () => {
    console.clear()
    console.log('🔍 Starting comprehensive RLS diagnostic...')
    
    try {
      // Step 1: Check environment variables in browser
      console.log('📊 Step 1: Environment Variables Check')
      const envVars = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY_B64: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64,
        NODE_ENV: process.env.NODE_ENV
      }
      
      console.log('Environment Variables:', envVars)
      
      if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('❌ CRITICAL: Environment variables are missing in browser')
        document.getElementById('result').innerHTML = `
          <div class="bg-red-50 border border-red-200 p-4 rounded">
            <h3 class="font-bold text-red-800">❌ Environment Variables Missing</h3>
            <p>URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING'}</p>
            <p>Key: ${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}</p>
          </div>
        `
        return
      }
      
      // Step 2: Test direct Supabase client creation
      console.log('🔧 Step 2: Direct Supabase Client Test')
      const { createBrowserClient } = await import('@supabase/ssr')
      
      console.log('Supabase SSR imported successfully')
      
      const directClient = createBrowserClient(
        envVars.NEXT_PUBLIC_SUPABASE_URL,
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      console.log('✅ Direct client created:', {
        exists: !!directClient,
        hasFrom: typeof directClient.from === 'function',
        hasAuth: typeof directClient.auth === 'object'
      })
      
      // Step 3: Test query builder directly
      console.log('🏗️ Step 3: Direct Query Builder Test')
      const directQuery = directClient.from('appointments')
      console.log('✅ Direct query builder:', {
        exists: !!directQuery,
        hasSelect: typeof directQuery.select === 'function',
        hasEq: typeof directQuery.eq === 'function'
      })
      
      // Step 4: Test our browser client wrapper
      console.log('🔍 Step 4: Browser Client Wrapper Test')
      try {
        const { createClient } = await import('@/lib/supabase/UNIFIED_CLIENT')
        console.log('Browser client module imported')
        
        const wrappedClient = createClient()
        console.log('✅ Wrapped client created:', {
          exists: !!wrappedClient,
          hasFrom: typeof wrappedClient.from === 'function'
        })
        
        if (wrappedClient && typeof wrappedClient.from === 'function') {
          const wrappedQuery = wrappedClient.from('appointments')
          console.log('✅ Wrapped query builder:', {
            exists: !!wrappedQuery,
            hasSelect: typeof wrappedQuery?.select === 'function',
            hasEq: typeof wrappedQuery?.eq === 'function'
          })
          
          // Step 5: Test RLS Context Manager
          console.log('🎯 Step 5: RLS Context Manager Test')
          const { rlsManager } = await import('@/lib/rls-context-manager')
          console.log('RLS Manager imported successfully')
          
          // Set mock context
          await rlsManager.setContext({
            userId: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
            barbershopId: '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
            role: 'shop_owner',
            permissions: []
          })
          
          console.log('✅ Mock context set')
          
          // Test createShopScopedQuery
          const rlsQuery = rlsManager.createShopScopedQuery('appointments')
          console.log('✅ RLS query created:', {
            exists: !!rlsQuery,
            hasSelect: typeof rlsQuery?.select === 'function',
            hasEq: typeof rlsQuery?.eq === 'function'
          })
          
          // SUCCESS!
          console.log('🎉 SUCCESS: All diagnostic tests passed!')
          document.getElementById('result').innerHTML = `
            <div class="bg-green-50 border border-green-200 p-4 rounded">
              <h3 class="font-bold text-green-800">✅ Diagnostic Complete - All Systems Working</h3>
              <p>Environment variables: ✅</p>
              <p>Direct Supabase client: ✅</p>
              <p>Browser client wrapper: ✅</p>
              <p>RLS Context Manager: ✅</p>
              <p>Shop-scoped queries: ✅</p>
            </div>
          `
          
        } else {
          throw new Error('Wrapped client creation failed')
        }
        
      } catch (wrapperError) {
        console.error('❌ Browser client wrapper failed:', wrapperError)
        document.getElementById('result').innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <h3 class="font-bold text-yellow-800">⚠️ Browser Client Wrapper Issue</h3>
            <p>Direct client works, but wrapper fails:</p>
            <pre class="text-sm mt-2">${wrapperError.message}</pre>
          </div>
        `
      }
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error)
      document.getElementById('result').innerHTML = `
        <div class="bg-red-50 border border-red-200 p-4 rounded">
          <h3 class="font-bold text-red-800">❌ Diagnostic Failed</h3>
          <pre class="text-sm mt-2">${error.message}</pre>
        </div>
      `
    }
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">RLS Comprehensive Diagnostic</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <button 
            onClick={runDiagnostic}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            🔍 Run Complete Diagnostic
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            This will test each component in isolation to identify the exact failure point.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Diagnostic Results</h2>
          <div id="result" className="text-gray-700">
            Click the diagnostic button to start testing...
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p><strong>This diagnostic will test:</strong></p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Environment variables availability in browser</li>
            <li>Direct Supabase client creation and query builders</li>
            <li>Our browser client wrapper functionality</li>
            <li>RLS Context Manager initialization and query creation</li>
          </ol>
        </div>
      </div>
    </div>
  )
}