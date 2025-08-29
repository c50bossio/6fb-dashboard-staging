'use client'

import { useState, useEffect } from 'react'
import UnifiedContextSelector from '@/components/shared/UnifiedContextSelector'
import { GlobalDashboardProvider } from '@/contexts/GlobalDashboardContext'

// Test component that demonstrates the unified context system
function TestContextPage() {
  const [pageData, setPageData] = useState({
    barbershops: [],
    contexts: [],
    error: null
  })

  // Test the database connection and context generation
  useEffect(() => {
    async function testContexts() {
      try {
        // First check database inspection
        const inspectResponse = await fetch('/api/debug/database?action=inspect')
        const inspectData = await inspectResponse.json()
        
        // Then check context simulation
        const seedResponse = await fetch('/api/debug/database?action=seed')
        const seedData = await seedResponse.json()
        
        setPageData({
          barbershops: inspectData.results?.barbershops?.data || [],
          contexts: seedData.results?.mock_contexts || [],
          error: null
        })
      } catch (error) {
        setPageData(prev => ({
          ...prev,
          error: error.message
        }))
      }
    }
    
    testContexts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Unified Context System Test
        </h1>
        
        {/* Test the UnifiedContextSelector */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Unified Context Selector Test
          </h2>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <UnifiedContextSelector 
              showQuickActions={true}
              className="w-full max-w-md"
            />
          </div>
        </div>
        
        {/* Database Test Results */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Database Connection Test
          </h2>
          
          {pageData.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {pageData.error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Available Barbershops</h3>
              <div className="bg-gray-50 p-4 rounded text-sm">
                {pageData.barbershops.length > 0 ? (
                  <div className="space-y-2">
                    {pageData.barbershops.map((shop, index) => (
                      <div key={index} className="border-l-4 border-blue-400 pl-3">
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-gray-600">{shop.city}, {shop.state}</div>
                        <div className="text-xs text-gray-500">ID: {shop.id}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No barbershops found</div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Generated Contexts</h3>
              <div className="bg-gray-50 p-4 rounded text-sm">
                {pageData.contexts.length > 0 ? (
                  <div className="space-y-2">
                    {pageData.contexts.map((context, index) => (
                      <div key={index} className="border-l-4 border-green-400 pl-3">
                        <div className="font-medium">{context.displayName}</div>
                        <div className="text-gray-600">{context.contextType} - {context.primaryView}</div>
                        <div className="text-xs text-gray-500">
                          Permissions: {context.permissions.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No contexts generated</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Test Instructions
          </h2>
          <div className="text-blue-700 space-y-2">
            <p>1. <strong>Context Selector:</strong> Should show dropdown with available contexts if mock data is working</p>
            <p>2. <strong>Database Connection:</strong> Should display barbershops from Supabase</p>
            <p>3. <strong>Context Generation:</strong> Should show simulated contexts based on barbershop data</p>
            <p>4. <strong>Expected Result:</strong> If working correctly, you should see "Toma45 Channelside" contexts</p>
          </div>
        </div>
        
        {/* Debug Information */}
        <div className="bg-gray-100 p-4 rounded-lg mt-8">
          <h3 className="font-medium text-gray-800 mb-2">Debug Info</h3>
          <div className="text-xs text-gray-600 font-mono">
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>Dev Mode: {process.env.NEXT_PUBLIC_DEV_MODE}</div>
            <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in GlobalDashboardProvider to test the context system
export default function TestContextPageWrapper() {
  return (
    <GlobalDashboardProvider>
      <TestContextPage />
    </GlobalDashboardProvider>
  )
}