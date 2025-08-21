'use client'

import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function TestCin7Page() {
  const router = useRouter()
  const [accountId, setAccountId] = useState('1fd319f3-0a8b-4314-bb82-603f47fe2069')
  const [apiKey, setApiKey] = useState('509db449-eafc-66bd-ac73-f02c7392426a')
  
  // Redirect to products page in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      router.push('/shop/products')
    }
  }, [router])
  const [testResult, setTestResult] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/cin7/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cin7-bypass': 'true'
        },
        body: JSON.stringify({ accountId, apiKey })
      })
      
      const data = await response.json()
      setTestResult({
        success: response.ok,
        status: response.status,
        data
      })
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const syncInventory = async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({ accountId, apiKey })
      })
      
      const data = await response.json()
      setSyncResult({
        success: response.ok,
        status: response.status,
        data
      })
    } catch (error) {
      setSyncResult({
        success: false,
        error: error.message
      })
    } finally {
      setSyncing(false)
    }
  }

  const saveCredentials = async () => {
    try {
      const response = await fetch('/api/cin7/credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-cin7-bypass': 'true'
        },
        body: JSON.stringify({ accountId, apiKey })
      })
      
      const data = await response.json()
      alert(data.message || 'Credentials saved!')
    } catch (error) {
      alert('Failed to save credentials: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cin7 Integration Test Page</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <AlertCircle className="inline-block w-4 h-4 mr-2" />
            This is a temporary test page to verify Cin7 integration while OAuth issues are being resolved.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cin7 Credentials</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Cin7 Account ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Cin7 API Key"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={testConnection}
            disabled={loading || !accountId || !apiKey}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>Test Connection</>
            )}
          </button>
          
          <button
            onClick={saveCredentials}
            disabled={!accountId || !apiKey}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Credentials
          </button>
          
          <button
            onClick={syncInventory}
            disabled={syncing || !accountId || !apiKey}
            className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {syncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>Sync Inventory</>
            )}
          </button>
        </div>

        {testResult && (
          <div className={`bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 ${
            testResult.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
              )}
              Connection Test Result
            </h3>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {syncResult && (
          <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            syncResult.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              {syncResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
              )}
              Sync Result
            </h3>
            <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}