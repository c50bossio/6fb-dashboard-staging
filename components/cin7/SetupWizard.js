'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircleIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  CloudArrowUpIcon,
  KeyIcon,
  CubeIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

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
  const [errors, setErrors] = useState({})

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
      
      // Add dev bypass header if in development mode
      if (typeof window !== 'undefined' && localStorage.getItem('dev_bypass') === 'true') {
        headers['x-dev-bypass'] = 'true'
      }
      
      const setupResponse = await fetch('/api/cin7/setup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          options: formData.syncSettings
        })
      })

      if (!setupResponse.ok) {
        throw new Error('Failed to save settings')
      }

      const setupData = await setupResponse.json()

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

      // Start sync
      const syncResponse = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers
      })

      clearInterval(progressInterval)
      setSyncProgress(100)

      const syncData = await syncResponse.json()
      
      // Store sync data for the completion screen
      const syncResult = {
        itemsSynced: syncData.count || syncData.itemsSynced || 0,
        lowStockCount: syncData.lowStockCount || 0,
        outOfStockCount: syncData.outOfStockCount || 0
      }
      
      setFormData(prev => ({ ...prev, syncResult }))

      // Even if no products, consider it successful
      if (syncData.success || syncData.count >= 0) {
        setTimeout(() => {
          onComplete({
            ...formData,
            syncedProducts: syncResult.itemsSynced,
            lowStock: syncResult.lowStockCount,
            outOfStock: syncResult.outOfStockCount,
            message: syncResult.itemsSynced === 0 
              ? 'Setup complete! You can add products to CIN7 at any time.'
              : `Successfully synced ${syncResult.itemsSynced} products!`
          })
        }, 1000)
      } else {
        throw new Error(syncData.error || 'Sync failed')
      }
    } catch (error) {
      setErrors({ sync: error.message })
      setSyncProgress(0)
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
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Paste your API Key here"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.apiKey ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
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

      case 4: // Initial Sync
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              {syncProgress === 100 ? 'Sync Complete!' : 'Syncing Your Inventory'}
            </h2>

            {syncProgress < 100 ? (
              <div className="space-y-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-amber-600 bg-amber-200">
                        Progress
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-amber-600">
                        {syncProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-amber-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${syncProgress}%` }}
                      transition={{ duration: 0.5 }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                    />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-gray-600 font-medium">
                    {syncProgress < 30 && 'Connecting to CIN7...'}
                    {syncProgress >= 30 && syncProgress < 60 && 'Fetching products...'}
                    {syncProgress >= 60 && syncProgress < 90 && 'Updating inventory levels...'}
                    {syncProgress >= 90 && syncProgress < 100 && 'Finalizing sync...'}
                  </p>
                  {syncProgress > 0 && syncProgress < 100 && (
                    <p className="text-xs text-gray-500 animate-pulse">
                      This may take a few moments depending on your inventory size
                    </p>
                  )}
                </div>

                {!isLoading && syncProgress === 0 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                      <p className="text-blue-800 text-sm">
                        {formData.accountName && formData.accountName !== 'Connected' 
                          ? `Ready to sync with ${formData.accountName}`
                          : 'Ready to sync your inventory'}
                      </p>
                    </div>
                    <button
                      onClick={handleInitialSync}
                      className="mx-auto px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center"
                    >
                      Start Syncing
                      <CloudArrowUpIcon className="w-5 h-5 ml-2" />
                    </button>
                    <button
                      onClick={() => onComplete({
                        ...formData,
                        syncedProducts: 0,
                        lowStock: 0,
                        outOfStock: 0
                      })}
                      className="mx-auto px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Skip for now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-center space-y-4"
              >
                <CheckCircleSolidIcon className="w-20 h-20 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold text-green-900">
                  All Set! Your inventory is now synced.
                </h3>
                <p className="text-gray-600">
                  CIN7 will automatically keep your inventory up to date.
                </p>
                <button
                  onClick={() => onComplete({
                    ...formData,
                    syncedProducts: formData.syncResult?.itemsSynced || 0,
                    lowStock: formData.syncResult?.lowStockCount || 0,
                    outOfStock: formData.syncResult?.outOfStockCount || 0,
                    message: formData.syncResult?.itemsSynced === 0 
                      ? 'Setup complete! You can add products to CIN7 at any time.'
                      : `Successfully synced ${formData.syncResult?.itemsSynced || 0} products!`
                  })}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Finish Setup
                </button>
              </motion.div>
            )}

            {errors.sync && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800">{errors.sync}</p>
                <button
                  onClick={() => {
                    setErrors({})
                    setSyncProgress(0)
                  }}
                  className="mt-2 text-red-700 hover:text-red-900 font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Progress Steps */}
        <div className="border-b border-gray-200 px-6 py-4">
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