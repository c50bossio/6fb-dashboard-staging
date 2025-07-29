'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CogIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Connect your existing Google Calendar to sync appointments',
    icon: CalendarIcon,
    category: 'Calendar',
    requiresAuth: true,
    fields: []
  },
  {
    id: 'trafft',
    name: 'Traft.com',
    description: 'Connect your Traft booking system to sync appointments and customers',
    icon: ClockIcon,
    category: 'Booking Platform',
    requiresAuth: true,
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', required: true },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { name: 'baseUrl', label: 'Base URL (optional)', type: 'url', required: false, placeholder: 'https://api.traft.com' }
    ]
  }
]

export default function IntegrationConnectionWizard({ barbershopId = 'default', onConnectionComplete }) {
  const [step, setStep] = useState('select') // 'select', 'configure', 'connecting', 'success', 'error'
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const [formData, setFormData] = useState({})
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState([])
  const [connectionResult, setConnectionResult] = useState(null)

  // Fetch existing integrations on mount
  useEffect(() => {
    fetchConnectedIntegrations()
  }, [barbershopId])

  const fetchConnectedIntegrations = async () => {
    try {
      const response = await fetch(`/api/integrations/list?barbershopId=${barbershopId}`)
      const result = await response.json()
      
      if (result.success) {
        setConnectedIntegrations(result.integrations || [])
      }
    } catch (error) {
      console.error('Failed to fetch connected integrations:', error)
    }
  }

  const handleIntegrationSelect = (integration) => {
    setSelectedIntegration(integration)
    setFormData({})
    setError(null)
    setStep('configure')
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleConnect = async () => {
    if (!selectedIntegration) return

    setIsConnecting(true)
    setError(null)
    setStep('connecting')

    try {
      if (selectedIntegration.id === 'google_calendar') {
        await connectGoogleCalendar()
      } else if (selectedIntegration.id === 'trafft') {
        await connectTraft()
      }
    } catch (error) {
      console.error('Connection failed:', error)
      setError(error.message)
      setStep('error')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectGoogleCalendar = async () => {
    // Get Google OAuth URL
    const response = await fetch(`/api/integrations/google/auth?barbershopId=${barbershopId}`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to get Google authorization URL')
    }

    // Redirect to Google OAuth
    window.location.href = result.authUrl
  }

  const connectTraft = async () => {
    // Validate required fields
    const requiredFields = selectedIntegration.fields.filter(field => field.required)
    for (const field of requiredFields) {
      if (!formData[field.name]) {
        throw new Error(`${field.label} is required`)
      }
    }

    const response = await fetch('/api/integrations/trafft/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        barbershopId,
        ...formData
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to connect to Traft')
    }

    setConnectionResult(result)
    setStep('success')
    
    // Refresh integrations list
    await fetchConnectedIntegrations()
    
    // Notify parent component
    if (onConnectionComplete) {
      onConnectionComplete(result)
    }
  }

  const handleDisconnect = async (integrationId) => {
    try {
      const integration = connectedIntegrations.find(i => i.id === integrationId)
      if (!integration) return

      let endpoint = ''
      let method = 'DELETE'
      let body = { barbershopId }

      if (integration.platform === 'google_calendar') {
        endpoint = '/api/integrations/google/auth'
      } else if (integration.platform === 'trafft') {
        endpoint = '/api/integrations/trafft/auth'
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        await fetchConnectedIntegrations()
      } else {
        setError(result.error || 'Failed to disconnect integration')
      }
    } catch (error) {
      console.error('Disconnect failed:', error)
      setError(error.message)
    }
  }

  const resetWizard = () => {
    setStep('select')
    setSelectedIntegration(null)
    setFormData({})
    setError(null)
    setConnectionResult(null)
  }

  const renderConnectionStatus = () => {
    if (connectedIntegrations.length === 0) {
      return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">No integrations connected</span>
          </div>
        </div>
      )
    }

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Connected Integrations</h3>
        <div className="space-y-2">
          {connectedIntegrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <div className="text-sm font-medium text-green-900">
                    {integration.platform === 'google_calendar' ? 'Google Calendar' : 
                     integration.platform === 'trafft' ? 'Traft.com' : integration.platform}
                  </div>
                  <div className="text-xs text-green-700">
                    Last sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDisconnect(integration.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderIntegrationSelect = () => {
    const connectedPlatforms = new Set(connectedIntegrations.map(i => i.platform))
    const availableIntegrations = AVAILABLE_INTEGRATIONS.filter(
      integration => !connectedPlatforms.has(integration.id)
    )

    if (availableIntegrations.length === 0) {
      return (
        <div className="text-center py-8">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Available Integrations Connected</h3>
          <p className="text-gray-600">You've connected all available integration platforms.</p>
        </div>
      )
    }

    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Connect a New Integration</h3>
        <div className="grid grid-cols-1 gap-4">
          {availableIntegrations.map((integration) => {
            const Icon = integration.icon
            return (
              <button
                key={integration.id}
                onClick={() => handleIntegrationSelect(integration)}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start">
                  <Icon className="h-8 w-8 text-blue-600 mt-1 mr-4" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{integration.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {integration.category}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderConfiguration = () => {
    if (!selectedIntegration) return null

    const Icon = selectedIntegration.icon

    return (
      <div>
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('select')}
            className="text-blue-600 hover:text-blue-700 mr-4"
          >
            ← Back
          </button>
          <Icon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Connect {selectedIntegration.name}</h3>
        </div>

        <p className="text-gray-600 mb-6">{selectedIntegration.description}</p>

        {selectedIntegration.fields.length > 0 ? (
          <div className="space-y-4 mb-6">
            {selectedIntegration.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFormChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={field.required}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800">
              This integration uses OAuth authentication. Click connect to authorize access to your account.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setStep('select')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    )
  }

  const renderConnecting = () => (
    <div className="text-center py-8">
      <CogIcon className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Connecting to {selectedIntegration?.name}</h3>
      <p className="text-gray-600">Please wait while we establish the connection...</p>
    </div>
  )

  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Successfully Connected!</h3>
      <p className="text-gray-600 mb-6">
        {selectedIntegration?.name} has been connected and is ready to sync your appointment data.
      </p>
      
      {connectionResult && (
        <div className="bg-green-50 p-4 rounded-lg mb-6 text-left">
          <h4 className="font-medium text-green-900 mb-2">Connection Details:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            {connectionResult.integration?.businessName && (
              <li>Business: {connectionResult.integration.businessName}</li>
            )}
            {connectionResult.integration?.email && (
              <li>Account: {connectionResult.integration.email}</li>
            )}
            <li>Connected: {new Date(connectionResult.integration?.createdAt).toLocaleString()}</li>
          </ul>
        </div>
      )}
      
      <button
        onClick={resetWizard}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Connect Another Integration
      </button>
    </div>
  )

  const renderError = () => (
    <div className="text-center py-8">
      <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Failed</h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <div className="flex justify-center space-x-3">
        <button
          onClick={() => setStep('configure')}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={resetWizard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Choose Different Integration
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Integration Connections</h2>
        <p className="text-gray-600">
          Connect your existing calendar and booking systems to sync appointment data with AI agents.
        </p>
      </div>

      {renderConnectionStatus()}

      {step === 'select' && renderIntegrationSelect()}
      {step === 'configure' && renderConfiguration()}
      {step === 'connecting' && renderConnecting()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
    </div>
  )
}