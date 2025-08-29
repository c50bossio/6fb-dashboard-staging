'use client'

import { useState } from 'react'

export default function SimpleTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const testAuth = async () => {
    setLoading(true)
    try {
      // Simple fetch to test if backend is working
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      setResult({ success: true, data })
    } catch (error) {
      setResult({ success: false, error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🧪 Simple Test Page</h1>
          
          <div className="space-y-4">
            <button
              onClick={testAuth}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ Testing...' : '🔐 Test Auth Session'}
            </button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? '✅ Success' : '❌ Error'}
                </h3>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🎯 Purpose</h3>
            <p className="text-blue-700">
              This simple test page avoids the complex React Query hooks that were causing infinite loops. 
              It directly tests the authentication system without triggering the problematic service layer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}