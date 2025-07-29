/**
 * Integration Wizard Component
 * Multi-platform onboarding flow for connecting various booking systems
 */

'use client'

import { useState, useEffect } from 'react'
import TrafftIntegrationSetup from './TrafftIntegrationSetup'

const SUPPORTED_PLATFORMS = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Connect your Google Calendar for calendar-based booking insights',
    icon: '📅',
    type: 'oauth',
    features: ['Calendar sync', 'Event parsing', 'Smart appointment detection'],
    difficulty: 'Easy',
    setupTime: '2 minutes'
  },
  {
    id: 'trafft',
    name: 'Trafft',
    description: 'Connect your existing Trafft booking system',
    icon: '📋',
    type: 'api_key',
    features: ['Full booking sync', 'Customer data', 'Revenue analytics'],
    difficulty: 'Easy',
    setupTime: '3 minutes'
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Import appointments from Acuity Scheduling',
    icon: '🗓️',
    type: 'oauth',
    features: ['Appointment sync', 'Client management', 'Service tracking'],
    difficulty: 'Medium',
    setupTime: '5 minutes'
  },
  {
    id: 'square',
    name: 'Square Appointments',
    description: 'Connect Square Appointments and point-of-sale data',
    icon: '⬜',
    type: 'oauth',
    features: ['Booking sync', 'Payment data', 'Customer insights'],
    difficulty: 'Medium',
    setupTime: '5 minutes'
  },
  {
    id: 'booksy',
    name: 'Booksy',
    description: 'Sync your Booksy marketplace bookings',
    icon: '📱',
    type: 'api_key',
    features: ['Marketplace bookings', 'Review sync', 'Customer data'],
    difficulty: 'Hard',
    setupTime: '10 minutes'
  },
  {
    id: 'generic',
    name: 'Generic Import',
    description: 'Upload CSV or iCal files from any booking system',
    icon: '📁',
    type: 'file_upload',
    features: ['CSV parsing', 'iCal import', 'Data validation'],
    difficulty: 'Easy',
    setupTime: '1 minute'
  }
]

export default function IntegrationWizard({ barbershopId, onIntegrationComplete }) {
  const [currentStep, setCurrentStep] = useState('platform-selection')
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [existingIntegrations, setExistingIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load existing integrations on mount
  useEffect(() => {
    loadExistingIntegrations()
  }, [barbershopId])

  /**
   * Load existing integrations for this barbershop
   */
  const loadExistingIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/integrations/list?barbershopId=${barbershopId || 'default'}`)
      const data = await response.json()
      
      if (response.ok) {
        setExistingIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Error loading integrations:', error)
      setError('Failed to load existing integrations')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle platform selection
   */
  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform)
    setCurrentStep('platform-setup')
    setError('')
  }

  /**
   * Handle integration completion
   */
  const handleIntegrationComplete = async (integrationData) => {
    await loadExistingIntegrations() // Refresh the list
    
    if (onIntegrationComplete) {
      onIntegrationComplete(integrationData)
    }
    
    setCurrentStep('completion')
  }

  /**
   * Go back to platform selection
   */
  const handleBackToPlatforms = () => {
    setSelectedPlatform(null)
    setCurrentStep('platform-selection')
    setError('')
  }

  /**
   * Check if a platform is already connected
   */
  const isPlatformConnected = (platformId) => {
    return existingIntegrations.some(integration => 
      integration.platform === platformId && integration.isActive
    )
  }

  /**
   * Get difficulty color class
   */
  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Connect Your Booking System
        </h1>
        <p className="text-lg text-gray-600">
          Import your existing appointments and get AI-powered business insights
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Platform Selection Step */}
      {currentStep === 'platform-selection' && (
        <div className="space-y-6">
          {/* Existing Integrations Summary */}
          {existingIntegrations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Connected Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {existingIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {SUPPORTED_PLATFORMS.find(p => p.id === integration.platform)?.name || integration.platform}
                    {integration.isActive ? ' ✓' : ' (inactive)'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUPPORTED_PLATFORMS.map((platform) => {
              const isConnected = isPlatformConnected(platform.id)
              
              return (
                <div
                  key={platform.id}
                  className={`relative bg-white border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
                    isConnected 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => !isConnected && handlePlatformSelect(platform)}
                >
                  {/* Connected Badge */}
                  {isConnected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      Connected ✓
                    </div>
                  )}

                  {/* Platform Header */}
                  <div className="flex items-center mb-4">
                    <div className="text-3xl mr-3">{platform.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{platform.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(platform.difficulty)}`}>
                          {platform.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">{platform.setupTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Description */}
                  <p className="text-gray-600 text-sm mb-4">{platform.description}</p>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Features:</h4>
                    <ul className="space-y-1">
                      {platform.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <span className="text-green-500 mr-2">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    {isConnected ? (
                      <button
                        className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-md font-medium cursor-default"
                        disabled
                      >
                        Already Connected
                      </button>
                    ) : (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors">
                        Connect {platform.name}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <strong className="text-gray-800">Don't see your platform?</strong>
                <p>Use the Generic Import to upload CSV or iCal files from any booking system.</p>
              </div>
              <div>
                <strong className="text-gray-800">Multiple locations?</strong>
                <p>You can connect the same platform multiple times for different locations.</p>
              </div>
              <div>
                <strong className="text-gray-800">Data privacy?</strong>
                <p>All integrations use secure OAuth or encrypted API connections. Your data stays private.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Setup Step */}
      {currentStep === 'platform-setup' && selectedPlatform && (
        <div className="space-y-6">
          {/* Back Button */}
          <div className="flex items-center">
            <button
              onClick={handleBackToPlatforms}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Platforms
            </button>
          </div>

          {/* Platform-Specific Setup Component */}
          {selectedPlatform.id === 'trafft' && (
            <TrafftIntegrationSetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}

          {selectedPlatform.id === 'google' && (
            <GoogleCalendarSetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}

          {selectedPlatform.id === 'acuity' && (
            <AcuitySetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}

          {selectedPlatform.id === 'square' && (
            <SquareSetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}

          {selectedPlatform.id === 'booksy' && (
            <BooksySetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}

          {selectedPlatform.id === 'generic' && (
            <GenericImportSetup
              barbershopId={barbershopId}
              onSetupComplete={handleIntegrationComplete}
            />
          )}
        </div>
      )}

      {/* Completion Step */}
      {currentStep === 'completion' && (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Integration Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your {selectedPlatform?.name} integration is now active and syncing data.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              View Dashboard
            </button>
            <button
              onClick={handleBackToPlatforms}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Connect Another Platform
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Placeholder components for other platforms
function GoogleCalendarSetup({ barbershopId, onSetupComplete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Google Calendar Setup</h2>
      <p className="text-gray-600 mb-4">Google Calendar integration coming soon!</p>
      <button
        onClick={() => onSetupComplete({ platform: 'google', status: 'demo' })}
        className="px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        Continue (Demo)
      </button>
    </div>
  )
}

function AcuitySetup({ barbershopId, onSetupComplete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Acuity Scheduling Setup</h2>
      <p className="text-gray-600 mb-4">Acuity integration coming soon!</p>
      <button
        onClick={() => onSetupComplete({ platform: 'acuity', status: 'demo' })}
        className="px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        Continue (Demo)
      </button>
    </div>
  )
}

function SquareSetup({ barbershopId, onSetupComplete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Square Appointments Setup</h2>
      <p className="text-gray-600 mb-4">Square integration coming soon!</p>
      <button
        onClick={() => onSetupComplete({ platform: 'square', status: 'demo' })}
        className="px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        Continue (Demo)
      </button>
    </div>
  )
}

function BooksySetup({ barbershopId, onSetupComplete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Booksy Setup</h2>
      <p className="text-gray-600 mb-4">Booksy integration coming soon!</p>
      <button
        onClick={() => onSetupComplete({ platform: 'booksy', status: 'demo' })}
        className="px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        Continue (Demo)
      </button>
    </div>
  )
}

function GenericImportSetup({ barbershopId, onSetupComplete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Generic File Import</h2>
      <p className="text-gray-600 mb-4">File import functionality coming soon!</p>
      <button
        onClick={() => onSetupComplete({ platform: 'generic', status: 'demo' })}
        className="px-6 py-2 bg-blue-600 text-white rounded-md"
      >
        Continue (Demo)
      </button>
    </div>
  )
}