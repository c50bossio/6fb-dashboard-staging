'use client'

import { useState } from 'react'
import { getShopAnalytics } from '@/lib/business-analytics'

export default function TestBusinessAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const testAnalytics = async () => {
    setLoading(true)
    setError(null)
    setAnalytics(null)
    
    try {
      // Test with a sample shop ID
      const shopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
      const result = await getShopAnalytics(shopId, 3)
      setAnalytics(result)
      console.log('✅ Business Analytics Test Successful:', result)
    } catch (err) {
      setError(err.message)
      console.error('❌ Business Analytics Test Failed:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Business Analytics Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <button 
            onClick={testAnalytics}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? '⏳ Testing Analytics...' : '🧪 Test Business Analytics'}
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            This will test the business analytics function with direct Supabase queries (bypassing RLS Context Manager).
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
            <h3 className="font-bold text-red-800">❌ Test Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {analytics && (
          <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
            <h3 className="font-bold text-green-800">✅ Test Successful</h3>
            <pre className="text-sm mt-2 overflow-auto bg-white p-3 rounded border">
              {JSON.stringify(analytics, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-500">
          <p><strong>This test checks:</strong></p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Direct Supabase query execution without RLS Context Manager</li>
            <li>Shop-scoped data filtering using .eq() calls</li>
            <li>Business analytics calculations and aggregations</li>
            <li>Error handling and validation</li>
          </ol>
        </div>
      </div>
    </div>
  )
}