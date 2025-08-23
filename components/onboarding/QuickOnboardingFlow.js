'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  SparklesIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ScissorsIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../SupabaseAuthProvider'
import SimplifiedLaunchStep from './SimplifiedLaunchStep'
import SimplifiedDataImport from './SimplifiedDataImport'
import EnhancedScheduleSelector from './EnhancedScheduleSelector'
import { platformImportConfigs } from '@/lib/platform-import-configs'

/**
 * QuickOnboardingFlow - Streamlined 3-4 step onboarding
 * Reduces 7 steps to minimum viable setup while preserving essential information
 */
export default function QuickOnboardingFlow({ onComplete, initialData = {}, profile }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  
  const [onboardingData, setOnboardingData] = useState({
    // Step 1: Business Essentials
    segmentationPath: initialData.segmentationPath || null,
    businessName: initialData.businessName || profile?.shop_name || '',
    businessType: initialData.businessType || 'barbershop',
    
    // Step 2: Services & Schedule (smart defaults)
    services: initialData.services || [],
    schedule: initialData.schedule || null,
    
    // Step 3: Payment & Launch
    paymentSetup: initialData.paymentSetup || {},
    
    // Optional: Import data
    importedData: initialData.importedData || null
  })

  const [errors, setErrors] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Define streamlined steps based on segmentation
  const getStepsForPath = (path) => {
    const baseSteps = [
      { 
        id: 'essentials', 
        title: 'Business Essentials', 
        icon: SparklesIcon,
        description: 'Quick setup to get you started',
        estimatedTime: '2 min'
      },
      { 
        id: 'services_schedule', 
        title: 'Services & Hours', 
        icon: ScissorsIcon,
        description: 'Set your offerings and availability',
        estimatedTime: '2 min'
      },
      { 
        id: 'payment_launch', 
        title: 'Launch Your Business', 
        icon: CheckCircleIcon,
        description: 'Choose how to get started',
        estimatedTime: '1 min'
      }
    ]

    // Add CSV import step for switching systems users
    if (path === 'switching_systems') {
      baseSteps.splice(2, 0, {
        id: 'data_import',
        title: 'Import Your Data',
        icon: DocumentArrowUpIcon,
        description: 'Bring over your existing data',
        estimatedTime: '2 min'
      })
    }

    return baseSteps
  }

  const steps = getStepsForPath(onboardingData.segmentationPath)
  const currentStepData = steps[currentStep]
  const progress = Math.round(((currentStep + 1) / steps.length) * 100)

  const updateData = (newData) => {
    setOnboardingData(prev => ({ ...prev, ...newData }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    
    try {
      console.log('🎉 Onboarding completed with data:', onboardingData)
      
      // Save onboarding data to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...onboardingData,
          userId: user?.id,
          profileId: profile?.id,
          completedAt: new Date().toISOString()
        })
      })
      
      if (!response.ok) {
        console.warn('Failed to save onboarding data to backend')
      } else {
        const result = await response.json()
        console.log('✅ Onboarding saved successfully:', result)
      }
      
      if (onComplete) {
        onComplete(onboardingData)
      }
    } catch (error) {
      console.error('Failed to save onboarding:', error)
      // Still complete even if save fails
      if (onComplete) {
        onComplete(onboardingData)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const validateCurrentStep = () => {
    const stepData = steps[currentStep]
    const newErrors = {}

    switch (stepData.id) {
      case 'essentials':
        if (!onboardingData.businessName?.trim()) {
          newErrors.businessName = 'Business name is required'
        }
        if (!onboardingData.segmentationPath) {
          newErrors.segmentationPath = 'Please select your business path'
        }
        break
      
      case 'services_schedule':
        if (!onboardingData.services?.length) {
          newErrors.services = 'At least one service is required'
        }
        if (!onboardingData.schedule) {
          newErrors.schedule = 'Business hours are required'
        }
        break

      case 'payment_launch':
        // No validation needed - both options are valid (launch now or set up payments)
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const renderStepContent = () => {
    const stepData = steps[currentStep]

    switch (stepData.id) {
      case 'essentials':
        return <BusinessEssentialsStep 
          data={onboardingData} 
          updateData={updateData} 
          errors={errors}
          onNext={handleNext}
        />
      
      case 'services_schedule':
        return <ServicesScheduleStep 
          data={onboardingData} 
          updateData={updateData} 
          errors={errors}
          onNext={handleNext}
        />
      
      case 'data_import':
        return <SimplifiedDataImport
          data={onboardingData} 
          updateData={updateData} 
          errors={errors}
          onNext={handleNext}
        />
      
      case 'payment_launch':
        return <SimplifiedLaunchStep
          data={onboardingData}
          updateData={updateData}
          onNext={handleComplete}
        />
      
      default:
        return <div>Unknown step</div>
    }
  }

  // Component render logging
  console.log('🚀 QuickOnboardingFlow: Rendering', { hasUser: !!user, hasProfile: !!profile })
  
  return (
    <>
      {/* Modal Overlay - FIXED POSITION TO APPEAR ON TOP */}
      <div className="fixed inset-0 z-[9999] overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        {/* Modal Content */}
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto relative">
          {/* Close Button */}
          <button
            onClick={() => {
              console.log('🔚 User closed onboarding modal')
              if (onComplete) {
                onComplete({ skipped: true, ...onboardingData })
              }
            }}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close onboarding"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
      {/* Progress Header - BookedBarber Brand Colors */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quick Setup</h1>
            <p className="text-gray-300">{steps.length} steps to get you live</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Progress</div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white font-medium">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="px-8 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-3 ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep 
                    ? 'bg-green-100 text-green-600' 
                    : index === currentStep 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {index < currentStep ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="hidden sm:block">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.estimatedTime}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ChevronRightIcon className="w-5 h-5 text-gray-300 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <currentStepData.icon className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">{currentStepData.title}</h2>
          </div>
          <p className="text-gray-600">{currentStepData.description}</p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="px-8 py-4 bg-gray-50 border-t flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Back
        </button>
        
        <div className="text-sm text-gray-500 self-center">
          Step {currentStep + 1} of {steps.length}
        </div>
        
        <button
          onClick={() => {
            if (validateCurrentStep()) {
              handleNext()
            }
          }}
          disabled={isProcessing}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            'Processing...'
          ) : currentStep === steps.length - 1 ? (
            'Launch Your Barbershop'
          ) : currentStep === 0 ? (
            <>
              Continue to Services
              <ArrowRightIcon className="w-4 h-4" />
            </>
          ) : currentStep === 1 ? (
            <>
              Continue to Payment
              <ArrowRightIcon className="w-4 h-4" />
            </>
          ) : (
            <>
              Continue
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div> {/* End modal content div */}
  </div> {/* End modal overlay div */}
  </>
  )
}

/**
 * Step 1: Business Essentials - Combines segmentation and business info
 */
function BusinessEssentialsStep({ data, updateData, errors, onNext }) {
  const [selectedPath, setSelectedPath] = useState(data.segmentationPath)
  const [businessName, setBusinessName] = useState(data.businessName)

  const segmentationPaths = [
    {
      id: 'first_barbershop',
      title: 'My First Barbershop',
      subtitle: 'Starting fresh in the business',
      icon: SparklesIcon,
      gradient: 'from-yellow-600 to-yellow-500',
      features: ['Guided setup', 'Best practices', 'Success tips']
    },
    {
      id: 'adding_locations',
      title: 'Adding Locations',
      subtitle: 'Expanding my business',
      icon: BuildingOfficeIcon,
      gradient: 'from-gray-700 to-gray-600',
      features: ['Multi-location tools', 'Franchise features', 'Centralized management']
    },
    {
      id: 'switching_systems',
      title: 'Switching Systems',
      subtitle: 'Migrating from another platform',
      icon: ArrowPathIcon,
      gradient: 'from-gray-800 to-gray-700',
      features: ['Data import', 'Migration assistance', 'Smooth transition']
    }
  ]

  const handlePathSelect = (pathId) => {
    setSelectedPath(pathId)
    updateData({ 
      segmentationPath: pathId,
      businessType: pathId === 'adding_locations' ? 'enterprise' : 'barbershop'
    })
  }

  const handleBusinessNameChange = (value) => {
    setBusinessName(value)
    updateData({ businessName: value })
  }

  const canProceed = selectedPath && businessName?.trim()

  return (
    <div className="space-y-8">
      {/* Path Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What brings you here today?</h3>
        {errors.segmentationPath && (
          <p className="text-red-600 text-sm mb-4">{errors.segmentationPath}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {segmentationPaths.map((path) => (
            <button
              key={path.id}
              onClick={() => handlePathSelect(path.id)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedPath === path.id
                  ? 'border-yellow-500 bg-yellow-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${path.gradient} flex items-center justify-center mb-4`}>
                <path.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{path.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{path.subtitle}</p>
              <div className="space-y-1">
                {path.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircleIcon className="w-3 h-3 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Business Name Input */}
      {selectedPath && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What's your business name?</h3>
          {errors.businessName && (
            <p className="text-red-600 text-sm mb-4">{errors.businessName}</p>
          )}
          <input
            type="text"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            placeholder="Enter your business name..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
            autoFocus
          />
          <p className="text-sm text-gray-600 mt-2">
            This will be displayed on your booking page and customer communications.
          </p>
        </div>
      )}

      {/* Removed duplicate continue button - navigation handled by footer */}
    </div>
  )
}

/**
 * Step 2: Services & Schedule - Side-by-side layout with smart defaults
 */
function ServicesScheduleStep({ data, updateData, errors, onNext }) {
  // Initialize from saved data to ensure persistence when navigating back
  const [selectedServices, setSelectedServices] = useState(() => {
    // If we have saved services, use them
    if (data.services && data.services.length > 0) {
      return data.services
    }
    // Otherwise use default selected services
    const defaults = []
    const templates = [
      { id: 'haircut', name: 'Haircut', duration: 30, price: 35, icon: '✂️', selected: true },
      { id: 'fade', name: 'Fade Cut', duration: 45, price: 40, icon: '💈', selected: true },
      { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, icon: '🧔', selected: true }
    ]
    templates.forEach(service => {
      if (service.selected) {
        defaults.push(service)
      }
    })
    return defaults
  })
  const [selectedSchedule, setSelectedSchedule] = useState(data.schedule || null)
  
  // Update parent data when services or schedule change
  // Use useRef to track if we're initializing to prevent infinite loops
  const isInitializing = useRef(true)
  
  useEffect(() => {
    if (!isInitializing.current) {
      updateData({ services: selectedServices })
    }
  }, [selectedServices])
  
  useEffect(() => {
    if (!isInitializing.current && selectedSchedule) {
      updateData({ schedule: selectedSchedule })
    }
  }, [selectedSchedule])
  
  useEffect(() => {
    isInitializing.current = false
  }, [])

  // Smart service templates based on business type
  const serviceTemplates = [
    { id: 'haircut', name: 'Haircut', duration: 30, price: 35, icon: '✂️', selected: true },
    { id: 'fade', name: 'Fade Cut', duration: 45, price: 40, icon: '💈', selected: true },
    { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, icon: '🧔', selected: true },
    { id: 'kids', name: 'Kids Cut', duration: 20, price: 25, icon: '👶', selected: false },
    { id: 'shave', name: 'Hot Towel Shave', duration: 30, price: 30, icon: '🔥', selected: false },
    { id: 'package', name: 'Haircut & Beard', duration: 50, price: 55, icon: '💯', selected: false }
  ]

  // Smart schedule templates
  const scheduleTemplates = [
    {
      id: 'traditional',
      name: 'Traditional',
      description: 'Mon-Fri 9-6, Sat 9-5, Sun closed',
      schedule: {
        Monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        Tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        Wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        Thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        Friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        Saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        Sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' }
      }
    },
    {
      id: 'extended',
      name: 'Extended Hours',
      description: 'Mon-Sat 8-8, Sun 10-6',
      schedule: {
        Monday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Tuesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Wednesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Thursday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Friday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Saturday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
        Sunday: { isOpen: true, openTime: '10:00', closeTime: '18:00' }
      }
    },
    {
      id: 'weekend',
      name: 'Weekend Focus',
      description: 'Thu-Sun, closed Mon-Wed',
      schedule: {
        Monday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        Tuesday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        Wednesday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        Thursday: { isOpen: true, openTime: '12:00', closeTime: '20:00' },
        Friday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        Saturday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        Sunday: { isOpen: true, openTime: '10:00', closeTime: '17:00' }
      }
    }
  ]

  useEffect(() => {
    // Set default services if none selected
    if (selectedServices.length === 0) {
      const defaultServices = serviceTemplates.filter(s => s.selected)
      setSelectedServices(defaultServices)
      updateData({ services: defaultServices })
    }
  }, [])

  const toggleService = (service) => {
    const isSelected = selectedServices.some(s => s.id === service.id)
    let newServices
    
    if (isSelected) {
      newServices = selectedServices.filter(s => s.id !== service.id)
    } else {
      newServices = [...selectedServices, service]
    }
    
    setSelectedServices(newServices)
    updateData({ services: newServices })
  }

  const selectSchedule = (template) => {
    setSelectedSchedule(template)
    updateData({ schedule: template })
  }

  const canProceed = selectedServices.length > 0 && selectedSchedule

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Services Column */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your Services</h3>
        {errors.services && (
          <p className="text-red-600 text-sm mb-4">{errors.services}</p>
        )}
        <div className="space-y-3">
          {serviceTemplates.map((service) => {
            const isSelected = selectedServices.some(s => s.id === service.id)
            return (
              <button
                key={service.id}
                onClick={() => toggleService(service)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{service.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-600">{service.duration}min • ${service.price}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircleIcon className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-sm text-gray-600 mt-4">
          You can add more services and adjust pricing after setup.
        </p>
      </div>

      {/* Schedule Column with Enhanced Selector */}
      <div>
        <EnhancedScheduleSelector 
          value={selectedSchedule}
          onChange={(schedule) => {
            setSelectedSchedule(schedule)
            updateData({ schedule })
          }}
        />
        {errors.schedule && (
          <p className="text-red-600 text-sm mt-2">{errors.schedule}</p>
        )}
      </div>

      {/* Removed duplicate continue button - navigation handled by footer */}
    </div>
  )
}