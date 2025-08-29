'use client'

import { useState } from 'react'

export default function TestAutomationSettingsPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const testAutomationSettings = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/booking-rules/automation-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult({ success: true, data })
        console.log('✅ Automation Settings API Test Successful:', data)
      } else {
        setError(`API returned ${response.status}: ${data.error || 'Unknown error'}`)
        console.error('❌ Automation Settings API Test Failed:', response.status, data)
      }
    } catch (err) {
      setError(err.message)
      console.error('❌ Automation Settings API Test Failed:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Automation Settings API Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <button 
            onClick={testAutomationSettings}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? '⏳ Testing API...' : '🧪 Test Automation Settings API'}
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            This will test the /api/booking-rules/automation-settings endpoint that was showing 500 errors.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
            <h3 className="font-bold text-red-800">❌ Test Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="bg-green-50 border border-green-200 p-4 rounded mb-6">
            <h3 className="font-bold text-green-800">✅ Test Successful</h3>
            <pre className="text-sm mt-2 overflow-auto bg-white p-3 rounded border max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-500">
          <p><strong>This test checks:</strong></p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>API endpoint accessibility and response</li>
            <li>Authentication and authorization handling</li>
            <li>Database query execution</li>
            <li>Error handling and response formatting</li>
          </ol>
        </div>
      </div>
    </div>
  )
}