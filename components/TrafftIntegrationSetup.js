/**
 * Trafft Integration Setup Component
 * Provides a setup wizard for connecting Trafft booking system
 */

'use client'

import { useState, useEffect } from 'react'

export default function TrafftIntegrationSetup({ barbershopId, onSetupComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [integrationStatus, setIntegrationStatus] = useState(null)
  
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    barbershopId: barbershopId || 'default'
  })

  const [testResults, setTestResults] = useState(null)

  // Check existing integration status on component mount
  useEffect(() => {
    checkIntegrationStatus()
  }, [barbershopId])

  /**
   * Check if Trafft integration is already configured
   */
  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch(`/api/integrations/trafft/auth?barbershopId=${barbershopId || 'default'}`)
      const data = await response.json()
      
      if (data.isConnected) {
        setIntegrationStatus(data.integration)
        setStep(4) // Skip to completion step
      }
    } catch (error) {
      console.error('Error checking integration status:', error)
    }
  }

  /**
   * Handle credential input changes
   */
  const handleCredentialChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  /**
   * Test Trafft API connection
   */
  const testConnection = async () => {
    if (!credentials.apiKey || !credentials.apiSecret) {
      setError('Please enter both API Key and API Secret')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/trafft/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok) {
        setTestResults({
          success: true,
          message: data.message,
          authenticatedAt: data.authenticatedAt
        })
        setSuccess('Connection successful! Proceeding to sync setup...')
        setTimeout(() => setStep(3), 1500)
      } else {
        setError(data.error || 'Authentication failed')
        setTestResults({
          success: false,
          error: data.details || data.error
        })
      }
    } catch (error) {
      setError('Failed to connect to Trafft API')
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Perform initial data sync
   */
  const performInitialSync = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/trafft/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId: credentials.barbershopId,
          syncType: 'full'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setTestResults({
          ...testResults,
          syncResults: data.summary,
          analytics: data.analytics
        })
        setSuccess(`Sync complete! Imported ${data.summary.appointments} appointments, ${data.summary.customers} customers, and ${data.summary.services} services.`)
        setStep(4)
        
        if (onSetupComplete) {
          onSetupComplete(data)
        }
      } else {
        setError(data.error || 'Sync failed')
      }
    } catch (error) {
      setError('Failed to sync data from Trafft')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Disconnect integration
   */
  const disconnectIntegration = async () => {
    if (!confirm('Are you sure you want to disconnect Trafft integration? This will stop data synchronization.')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/integrations/trafft/auth', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId: credentials.barbershopId
        })
      })

      if (response.ok) {
        setIntegrationStatus(null)
        setStep(1)
        setSuccess('Trafft integration disconnected successfully')
        setTestResults(null)
      } else {
        setError('Failed to disconnect integration')
      }
    } catch (error) {
      setError('Failed to disconnect integration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Trafft Integration Setup
        </h2>
        <p className="text-gray-600">
          Connect your Trafft booking system to enable AI-powered business insights
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step >= stepNumber
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}
            >
              {stepNumber}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Setup</span>
          <span>Test</span>
          <span>Sync</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Step 1: API Credentials */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 1: Enter Trafft API Credentials</h3>
            <p className="text-gray-600 mb-4">
              You can find your API credentials in your Trafft dashboard under Features & Integration → API & Connectors.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={credentials.apiKey}
                onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                placeholder="Enter your Trafft API Key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Secret
              </label>
              <input
                type="password"
                value={credentials.apiSecret}
                onChange={(e) => handleCredentialChange('apiSecret', e.target.value)}
                placeholder="Enter your Trafft API Secret"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barbershop ID (Optional)
              </label>
              <input
                type="text"
                value={credentials.barbershopId}
                onChange={(e) => handleCredentialChange('barbershopId', e.target.value)}
                placeholder="Enter barbershop ID or leave default"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!credentials.apiKey || !credentials.apiSecret}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Test Connection */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 2: Test Connection</h3>
            <p className="text-gray-600 mb-4">
              Let's test your Trafft API connection to ensure everything is working correctly.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium mb-2">Connection Details:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>API Key: {credentials.apiKey.substring(0, 8)}...</li>
              <li>Barbershop ID: {credentials.barbershopId}</li>
            </ul>
          </div>

          {testResults && (
            <div className={`p-4 rounded-md ${testResults.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h4 className={`font-medium mb-2 ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResults.success ? 'Connection Successful!' : 'Connection Failed'}
              </h4>
              <p className={`text-sm ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.message || testResults.error}
              </p>
              {testResults.authenticatedAt && (
                <p className="text-sm text-green-600 mt-1">
                  Authenticated at: {new Date(testResults.authenticatedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Initial Sync */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Step 3: Initial Data Sync</h3>
            <p className="text-gray-600 mb-4">
              Now let's sync your existing Trafft data to enable AI-powered business insights.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">What will be synced:</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Appointments (last 30 days)</li>
              <li>• Customer records</li>
              <li>• Services and pricing</li>
              <li>• Employee information</li>
              <li>• Business analytics for AI insights</li>
            </ul>
          </div>

          {testResults?.syncResults && (
            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Sync Results:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-green-600">
                <div>Appointments: {testResults.syncResults.appointments}</div>
                <div>Customers: {testResults.syncResults.customers}</div>
                <div>Services: {testResults.syncResults.services}</div>
                <div>Employees: {testResults.syncResults.employees}</div>
                <div className="col-span-2">Total Revenue: ${testResults.syncResults.totalRevenue?.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={performInitialSync}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing Data...
                </>
              ) : (
                'Start Sync'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Setup Complete */}
      {step === 4 && (
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Trafft Integration Complete!</h3>
            <p className="text-gray-600 mb-4">
              Your Trafft booking system is now connected and syncing with the AI Agent System.
            </p>
          </div>

          {integrationStatus && (
            <div className="bg-gray-50 p-4 rounded-md text-left">
              <h4 className="font-medium mb-2">Integration Status:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Status: <span className="text-green-600 font-medium">Active</span></div>
                <div>Connected: {new Date(integrationStatus.authenticatedAt).toLocaleDateString()}</div>
                <div>Last Sync: {new Date(integrationStatus.lastSyncAt).toLocaleString()}</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">What's next:</p>
              <ul className="space-y-1 text-left">
                <li>• Real-time appointment updates will be synced automatically</li>
                <li>• AI agents now have access to your business data for insights</li>
                <li>• Visit the Dashboard to see your business analytics</li>
                <li>• Chat with AI agents for personalized business recommendations</li>
              </ul>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={disconnectIntegration}
                className="px-6 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}