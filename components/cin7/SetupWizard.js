'use client'

import { 
  CheckCircleIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  CloudArrowUpIcon,
  KeyIcon,
  CubeIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function SetupWizard({ onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    system: 'cin7',
    accountId: '',
    apiKey: '',
    accountName: '',
    syncSettings: {
      autoSync: true,
      syncInterval: 15,
      enableWebhooks: true,
      lowStockAlerts: true
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [testStatus, setTestStatus] = useState(null)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncCompleted, setSyncCompleted] = useState(false)
  const [errors, setErrors] = useState({})
  const [showApiKey, setShowApiKey] = useState(false)

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle click outside to close modal
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const steps = [
    { id: 'welcome', title: 'Welcome', icon: SparklesIcon },
    { id: 'system', title: 'Choose System', icon: CubeIcon },
    { id: 'credentials', title: 'Add Credentials', icon: KeyIcon },
    { id: 'test', title: 'Test Connection', icon: CloudArrowUpIcon },
    { id: 'sync', title: 'Initial Sync', icon: CheckCircleIcon }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  const handleTestConnection = async () => {
    setIsLoading(true)
    setTestStatus(null)
    setErrors({})

    try {
      const response = await fetch('/api/cin7/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          apiKey: formData.apiKey
        })
      })

      const data = await response.json()

      if (data.success) {
        setTestStatus({
          success: true,
          message: 'Connection successful!',
          details: {
            accountName: data.accountName,
            productCount: data.productCount,
            lastActivity: data.lastActivity
          }
        })
        setFormData(prev => ({ ...prev, accountName: data.accountName }))
        
        // Auto-advance after successful test
        setTimeout(() => {
          setCurrentStep(4) // Move directly to sync step
        }, 2000)
      } else {
        setTestStatus({
          success: false,
          message: data.message || 'Connection failed',
          details: null
        })
        setErrors({ connection: data.error })
      }
    } catch (error) {
      setTestStatus({
        success: false,
        message: 'Unable to connect',
        details: null
      })
      setErrors({ connection: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitialSync = async () => {
    setIsLoading(true)
    setSyncProgress(0)

    try {
      // First save credentials
      const headers = { 'Content-Type': 'application/json' }
      
      // Detect development mode and add dev bypass header
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           (typeof window !== 'undefined' && window.location.hostname === 'localhost')
      const devBypassSet = typeof window !== 'undefined' && localStorage.getItem('dev_bypass') === 'true'
      const isDevMode = isDevelopment || devBypassSet
      
      if (isDevMode) {
        headers['x-dev-bypass'] = 'true'
        
        // Ensure dev_bypass is set in localStorage for consistency
        if (typeof window !== 'undefined' && !localStorage.getItem('dev_bypass')) {
          localStorage.setItem('dev_bypass', 'true')
          console.log('✅ Development mode detected - dev bypass enabled')
        }
      }
      
      console.log('🔧 Setup request config:', {
        devMode: isDevMode,
        headers: { ...headers, 'x-dev-bypass': headers['x-dev-bypass'] || 'false' },
        environment: process.env.NODE_ENV
      })
      
      const setupResponse = await fetch('/api/cin7/setup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          options: formData.syncSettings
        })
      })

      if (!setupResponse.ok) {
        // Extract detailed error message from API response
        let errorMessage = 'Failed to save settings'
        let errorDetails = null
        
        try {
          const errorData = await setupResponse.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          errorDetails = errorData.details || errorData.debug || null
          
          // Set detailed error for user display
          setErrors({
            setup: errorMessage,
            details: errorDetails
          })
          
          console.error('❌ Setup failed:', {
            status: setupResponse.status,
            statusText: setupResponse.statusText,
            error: errorMessage,
            details: errorDetails
          })
          
        } catch (parseError) {
          // If JSON parsing fails, use status text
          const errorText = await setupResponse.text()
          errorMessage = errorText || `Setup failed: ${setupResponse.status} ${setupResponse.statusText}`
          setErrors({ setup: errorMessage })
          
          console.error('❌ Setup failed (parse error):', {
            status: setupResponse.status,
            statusText: setupResponse.statusText,
            rawResponse: errorText
          })
        }
        
        throw new Error(errorMessage)
      }

      const setupData = await setupResponse.json()
      
      // Check if setup was successful and show appropriate feedback
      if (!setupData.success) {
        const errorMessage = setupData.error || setupData.message || 'Setup completed but with issues'
        setErrors({
          setup: errorMessage,
          setupWarning: setupData.warning || null,
          connectionTested: setupData.connectionTested || false
        })
        
        // Don't throw error if credentials were saved, just show warning
        if (setupData.credentialsSaved) {
          console.warn('⚠️ Setup partially successful:', setupData)
        } else {
          throw new Error(errorMessage)
        }
      } else {
        // Clear any previous setup errors on success
        setErrors(prev => ({
          ...prev,
          setup: null,
          setupWarning: null
        }))
        console.log('✅ Setup successful:', setupData)
      }

      // Setup is complete! Store setup result and show completion/sync choice
      const setupResult = {
        credentialsSaved: setupData.credentialsSaved || false,
        connectionTested: setupData.connectionTested || false,
        accountName: setupData.accountName || formData.accountName,
        webhooksRegistered: setupData.webhooksRegistered || false,
        nextSteps: setupData.nextSteps || [],
        readyForSync: setupData.success && setupData.connectionTested
      }
      
      setFormData(prev => ({ 
        ...prev, 
        setupResult,
        // Store sync credentials for manual sync later
        syncCredentials: {
          accountId: formData.accountId,
          apiKey: formData.apiKey,
          accountName: formData.accountName
        }
      }))

      // Move to setup completion screen (not auto-sync)
      setTimeout(() => {
        setCurrentStep(4) // Go to completion screen
        setSyncProgress(0) // Reset sync progress
        
        // Show setup completion message
        console.log('🎉 Setup completed successfully:', setupResult)
      }, 500)
    } catch (error) {
      setErrors({ setup: error.message })
      setSyncProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSync = async () => {
    setIsLoading(true)
    setSyncProgress(0)
    setErrors(prev => ({ ...prev, sync: null })) // Clear previous sync errors

    try {
      // Use stored sync credentials
      const { syncCredentials } = formData
      if (!syncCredentials || !syncCredentials.accountId || !syncCredentials.apiKey) {
        throw new Error('No sync credentials available. Please complete setup first.')
      }

      console.log('🔄 Starting manual sync with stored credentials')

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // Setup headers with dev bypass
      const headers = { 'Content-Type': 'application/json' }
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           (typeof window !== 'undefined' && window.location.hostname === 'localhost')
      const devBypassSet = typeof window !== 'undefined' && localStorage.getItem('dev_bypass') === 'true'
      const isDevMode = isDevelopment || devBypassSet
      
      if (isDevMode) {
        headers['x-dev-bypass'] = 'true'
      }

      const syncBody = {
        accountId: syncCredentials.accountId,
        apiKey: syncCredentials.apiKey,
        accountName: syncCredentials.accountName
      }
      
      console.log('🔄 Manual sync request config:', {
        devMode: isDevMode,
        headers: { ...headers, 'x-dev-bypass': headers['x-dev-bypass'] || 'false' },
        syncBody: { ...syncBody, apiKey: syncBody.apiKey ? '[REDACTED]' : 'missing' }
      })
      
      const syncResponse = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify(syncBody)
      })

      clearInterval(progressInterval)
      setSyncProgress(100)

      if (!syncResponse.ok) {
        // Extract detailed error message from sync API response
        let errorMessage = `Sync request failed: ${syncResponse.status} ${syncResponse.statusText}`
        let errorDetails = null
        
        try {
          const errorData = await syncResponse.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          errorDetails = errorData.details || errorData.debug || null
          
          console.error('❌ Manual sync failed:', {
            status: syncResponse.status,
            statusText: syncResponse.statusText,
            error: errorMessage,
            details: errorDetails
          })
          
        } catch (parseError) {
          // If JSON parsing fails, use text response
          const errorText = await syncResponse.text()
          errorMessage = errorText || errorMessage
          
          console.error('❌ Manual sync failed (parse error):', {
            status: syncResponse.status,
            statusText: syncResponse.statusText,
            rawResponse: errorText
          })
        }
        
        throw new Error(errorMessage)
      }

      const syncData = await syncResponse.json()
      
      // Store sync data for the completion screen
      const syncResult = {
        itemsSynced: syncData.count || syncData.itemsSynced || 0,
        lowStockCount: syncData.lowStockCount || 0,
        outOfStockCount: syncData.outOfStockCount || 0,
        totalFetched: syncData.totalFetched || syncData.count || 0
      }
      
      setFormData(prev => ({ ...prev, syncResult }))

      // Check if sync was successful
      if (syncData.success || syncData.count >= 0) {
        console.log('✅ Manual sync completed successfully:', syncResult)
        
        // Set sync completed to show completion UI
        setTimeout(() => {
          setSyncCompleted(true)
        }, 1000) // Small delay to show 100% progress
      } else {
        throw new Error(syncData.error || 'Sync completed but with no results')
      }
      
    } catch (error) {
      setErrors(prev => ({ ...prev, sync: error.message }))
      setSyncProgress(0)
      setSyncCompleted(false) // Ensure sync completion is reset on error
      console.error('❌ Manual sync error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome to Inventory Sync Setup!
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Connect your warehouse to keep stock levels accurate across all channels. 
              This takes less than 2 minutes.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
              <ul className="text-left text-blue-800 space-y-1">
                <li>• Your CIN7 Account ID</li>
                <li>• An API Application Key</li>
                <li>• About 2 minutes</li>
              </ul>
            </div>
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold text-lg flex items-center mx-auto"
            >
              Get Started
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </button>
          </motion.div>
        )

      case 1: // Choose System
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Which inventory system do you use?
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, system: 'cin7' }))
                  handleNext()
                }}
                className={`p-6 border-2 rounded-lg transition-all ${
                  formData.system === 'cin7' 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <CubeIcon className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                <h3 className="font-semibold">CIN7</h3>
                <p className="text-sm text-gray-600 mt-1">Core & Omni</p>
              </button>
              
              <button
                disabled
                className="p-6 border-2 border-gray-100 rounded-lg opacity-50 cursor-not-allowed"
              >
                <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="font-semibold text-gray-400">QuickBooks</h3>
                <p className="text-sm text-gray-400 mt-1">Coming Soon</p>
              </button>
              
              <button
                disabled
                className="p-6 border-2 border-gray-100 rounded-lg opacity-50 cursor-not-allowed"
              >
                <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="font-semibold text-gray-400">Custom API</h3>
                <p className="text-sm text-gray-400 mt-1">Coming Soon</p>
              </button>
            </div>
          </motion.div>
        )

      case 2: // Credentials
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Let's get your CIN7 credentials
            </h2>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="font-semibold text-amber-900">Quick Guide:</h3>
                  <ol className="mt-2 text-sm text-amber-800 space-y-1">
                    <li>1. Open CIN7 in a new tab</li>
                    <li>2. Go to Settings → Integrations & API → API v1</li>
                    <li>3. Copy your Account ID and create an API Key</li>
                  </ol>
                  <a
                    href="https://inventory.dearsystems.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-3 text-amber-700 hover:text-amber-900 font-medium"
                  >
                    Open CIN7 Settings
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account ID
                </label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  placeholder="Paste your Account ID here"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.accountId ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.accountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Application Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Paste your API Key here"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className={`w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      errors.apiKey ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    title={showApiKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showApiKey ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.apiKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </button>
              <button
                onClick={() => {
                  if (!formData.accountId || !formData.apiKey) {
                    setErrors({
                      accountId: !formData.accountId ? 'Account ID is required' : '',
                      apiKey: !formData.apiKey ? 'API Key is required' : ''
                    })
                    return
                  }
                  handleNext()
                  handleTestConnection()
                }}
                disabled={!formData.accountId || !formData.apiKey}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Connection
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </button>
            </div>
          </motion.div>
        )

      case 3: // Test Connection
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Testing Your Connection
            </h2>

            {isLoading && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-gray-600 animate-pulse">Connecting to CIN7...</p>
                <div className="max-w-xs mx-auto">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="animate-pulse">• Validating credentials...</p>
                    <p className="animate-pulse delay-75">• Checking API access...</p>
                    <p className="animate-pulse delay-150">• Fetching account details...</p>
                  </div>
                </div>
              </div>
            )}

            {testStatus && !isLoading && (
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {testStatus.success ? (
                    <>
                      <CheckCircleSolidIcon className="w-16 h-16 text-green-500 mx-auto" />
                      <h3 className="text-xl font-semibold text-green-900">
                        {testStatus.message}
                      </h3>
                      {testStatus.details && (
                        <div className="bg-green-50 p-4 rounded-lg max-w-md mx-auto text-left">
                          <dl className="space-y-2">
                            <div className="flex justify-between">
                              <dt className="text-green-700">Account:</dt>
                              <dd className="font-medium text-green-900">
                                {testStatus.details.accountName}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-green-700">Products Found:</dt>
                              <dd className="font-medium text-green-900">
                                {testStatus.details.productCount || 0}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-green-700">Last Activity:</dt>
                              <dd className="font-medium text-green-900">
                                {testStatus.details.lastActivity || 'Just now'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          {testStatus.details?.productCount === 0 
                            ? 'No products found in CIN7. You can add products later.'
                            : 'Advancing to sync in a moment...'}
                        </p>
                        <button
                          onClick={() => {
                            setCurrentStep(4)
                            handleInitialSync()
                          }}
                          className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                        >
                          Continue to Sync
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto" />
                      <h3 className="text-xl font-semibold text-red-900">
                        {testStatus.message}
                      </h3>
                      {errors.connection && (
                        <div className="bg-red-50 p-4 rounded-lg max-w-md mx-auto">
                          <p className="text-red-800">{errors.connection}</p>
                          <button
                            onClick={() => {
                              setCurrentStep(2)
                              setTestStatus(null)
                              setErrors({})
                            }}
                            className="mt-3 text-red-700 hover:text-red-900 font-medium"
                          >
                            Go back and check credentials
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        )

      case 4: // Setup Completion & Manual Sync
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Setup Results Display */}
            {formData.setupResult && !formData.syncResult && (
              <>
                <div className="text-center">
                  <CheckCircleSolidIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Setup Complete!
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Your CIN7 credentials have been {formData.setupResult.credentialsSaved ? 'saved' : 'processed'} successfully.
                  </p>
                </div>

                {/* Setup Status Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Setup Status</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-700">Credentials Saved:</dt>
                      <dd className={`font-medium ${formData.setupResult.credentialsSaved ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.setupResult.credentialsSaved ? '✅ Yes' : '❌ No'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-700">Connection Test:</dt>
                      <dd className={`font-medium ${formData.setupResult.connectionTested ? 'text-green-600' : 'text-yellow-600'}`}>
                        {formData.setupResult.connectionTested ? '✅ Passed' : '⚠️ Failed'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-700">Account:</dt>
                      <dd className="font-medium text-gray-900">
                        {formData.setupResult.accountName || 'Not detected'}
                      </dd>
                    </div>
                    {formData.setupResult.webhooksRegistered && (
                      <div className="flex justify-between items-center">
                        <dt className="text-gray-700">Webhooks:</dt>
                        <dd className="font-medium text-green-600">✅ Registered</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Next Steps */}
                {formData.setupResult.nextSteps && formData.setupResult.nextSteps.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {formData.setupResult.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sync Action Buttons */}
                <div className="space-y-4">
                  {formData.setupResult.readyForSync ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-green-800">Ready to Sync!</h4>
                          <p className="mt-1 text-sm text-green-700">
                            Your connection test passed. You can now sync your inventory from CIN7.
                          </p>
                          <button
                            onClick={handleManualSync}
                            disabled={isLoading}
                            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Syncing...
                              </>
                            ) : (
                              <>
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                Start Sync Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-yellow-800">Connection Issue</h4>
                          <p className="mt-1 text-sm text-yellow-700">
                            Your credentials were saved but the connection test failed. 
                            You can still try to sync, but you may need to verify your credentials first.
                          </p>
                          <div className="mt-3 space-x-3">
                            <button
                              onClick={() => setCurrentStep(2)} // Go back to credentials step
                              className="text-yellow-700 hover:text-yellow-900 font-medium text-sm"
                            >
                              Check Credentials
                            </button>
                            <button
                              onClick={handleManualSync}
                              disabled={isLoading}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 text-sm"
                            >
                              {isLoading ? 'Syncing...' : 'Try Sync Anyway'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Skip Sync Option */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        onComplete({
                          ...formData,
                          message: 'CIN7 setup completed successfully. You can sync your inventory anytime from the Product Management page.'
                        })
                      }}
                      className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                    >
                      Skip Sync for Now
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Sync in Progress Display */}
            {isLoading && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Syncing Your Inventory
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Please wait while we sync your products from CIN7
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                          Progress
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          {syncProgress}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${syncProgress}%` }}
                        transition={{ duration: 0.5 }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-gray-700 font-medium">
                      {syncProgress < 30 && 'Connecting to CIN7...'}
                      {syncProgress >= 30 && syncProgress < 60 && 'Fetching products...'}
                      {syncProgress >= 60 && syncProgress < 90 && 'Processing inventory data...'}
                      {syncProgress >= 90 && 'Finalizing sync...'}
                    </p>
                    <p className="text-xs text-gray-500 animate-pulse">
                      This may take a few moments depending on your inventory size
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sync Complete Display */}
            {syncCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-center space-y-6"
              >
                <div>
                  <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-900 mb-2">
                    Sync Complete!
                  </h3>
                  <p className="text-gray-600">
                    Your inventory has been successfully synced with CIN7
                  </p>
                </div>

                {/* Sync Results Summary */}
                {formData.syncResult && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 max-w-md mx-auto">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Sync Summary</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>✅ Products synced: {formData.syncResult.itemsSynced || 0}</p>
                      {formData.syncResult.lowStockCount > 0 && (
                        <p>⚠️ Low stock items: {formData.syncResult.lowStockCount}</p>
                      )}
                      {formData.syncResult.outOfStockCount > 0 && (
                        <p>❌ Out of stock items: {formData.syncResult.outOfStockCount}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onComplete({
                    ...formData,
                    syncedProducts: formData.syncResult?.itemsSynced || 0,
                    lowStock: formData.syncResult?.lowStockCount || 0,
                    outOfStock: formData.syncResult?.outOfStockCount || 0,
                    message: formData.syncResult?.itemsSynced === 0 
                      ? 'CIN7 setup complete! You can add products to CIN7 at any time.'
                      : `Successfully synced ${formData.syncResult?.itemsSynced || 0} products from CIN7!`
                  })}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Complete Setup
                </button>
              </motion.div>
            )}

            {/* Sync Error Display */}
            {errors.sync && (
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Sync Failed
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{errors.sync}</p>
                    
                    <div className="mt-3 space-x-3">
                      <button
                        onClick={handleManualSync}
                        disabled={isLoading}
                        className="text-red-700 hover:text-red-900 font-medium text-sm disabled:opacity-50"
                      >
                        {isLoading ? 'Retrying...' : 'Try Again'}
                      </button>
                      <button
                        onClick={() => {
                          onComplete({
                            ...formData,
                            syncedProducts: 0,
                            message: 'CIN7 setup completed. Sync can be done later from the Product Management page.'
                          })
                        }}
                        className="text-red-700 hover:text-red-900 font-medium text-sm"
                      >
                        Skip Sync
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Error Display */}
            {errors.setup && (
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Setup Error
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{errors.setup}</p>
                    
                    {errors.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 bg-red-25 p-2 rounded overflow-x-auto">
                          {typeof errors.details === 'object' 
                            ? JSON.stringify(errors.details, null, 2) 
                            : errors.details
                          }
                        </pre>
                      </details>
                    )}
                    
                    <button
                      onClick={() => {
                        setErrors(prev => ({ ...prev, setup: null, details: null }))
                        setSyncProgress(0)
                      }}
                      className="mt-3 text-red-700 hover:text-red-900 font-medium text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Setup Warning Display (when credentials saved but connection failed) */}
            {errors.setupWarning && (
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Credentials Saved with Warning
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">{errors.setupWarning}</p>
                    <p className="mt-1 text-xs text-yellow-600">
                      Your credentials have been saved but the connection test failed. 
                      You can still try to sync, or verify your credentials first.
                    </p>
                    
                    <div className="mt-3 flex space-x-3">
                      <button
                        onClick={() => setCurrentStep(2)} // Go back to credentials step
                        className="text-yellow-700 hover:text-yellow-900 font-medium text-sm"
                      >
                        Check Credentials
                      </button>
                      <button
                        onClick={() => setErrors(prev => ({ ...prev, setupWarning: null }))}
                        className="text-yellow-700 hover:text-yellow-900 font-medium text-sm"
                      >
                        Continue Anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errors.sync && (
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Sync Error
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{errors.sync}</p>
                    <button
                      onClick={() => {
                        setErrors(prev => ({ ...prev, sync: null }))
                        setSyncProgress(0)
                      }}
                      className="mt-3 text-red-700 hover:text-red-900 font-medium text-sm"
                    >
                      Try Sync Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Universal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Close setup wizard"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Progress Steps */}
        <div className="border-b border-gray-200 px-6 py-4 pr-16">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-full h-1 mx-2 transition-colors ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <span
                key={step.id}
                className={`text-xs ${
                  index === currentStep ? 'text-amber-600 font-semibold' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {renderStepContent()}
        </div>

        {/* Close button */}
        {currentStep === 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Maybe Later
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}