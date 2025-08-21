'use client'

import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  KeyIcon,
  AcademicCapIcon,
  CogIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function BarberOnboardingFlow({ barberId, onComplete }) {
  const [onboardingData, setOnboardingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeStep, setActiveStep] = useState(null)

  useEffect(() => {
    fetchOnboardingData()
  }, [barberId])

  const fetchOnboardingData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shop/barbers/${barberId}/onboarding`)
      const data = await response.json()
      
      if (response.ok) {
        setOnboardingData(data)
      } else {
        console.error('Failed to fetch onboarding data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching onboarding data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOnboardingStep = async (stepKey, value, additionalData = {}) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/shop/barbers/${barberId}/onboarding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [stepKey]: value,
          ...additionalData
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        await fetchOnboardingData() // Refresh data
        if (result.onboarding?.fully_onboarded && onComplete) {
          onComplete()
        }
      } else {
        console.error('Failed to update onboarding:', result.error)
      }
    } catch (error) {
      console.error('Error updating onboarding:', error)
    } finally {
      setUpdating(false)
    }
  }

  const onboardingSteps = [
    {
      key: 'profile_completed',
      title: 'Complete Profile',
      description: 'Basic profile information and photo',
      icon: UserIcon,
      category: 'setup',
      required: true
    },
    {
      key: 'license_uploaded',
      title: 'Upload License',
      description: 'Valid barbering license documentation',
      icon: DocumentTextIcon,
      category: 'documents',
      required: true
    },
    {
      key: 'insurance_uploaded',
      title: 'Upload Insurance',
      description: 'Liability insurance certificate',
      icon: DocumentTextIcon,
      category: 'documents',
      required: false
    },
    {
      key: 'contract_signed',
      title: 'Sign Contract',
      description: 'Employment or booth rental agreement',
      icon: DocumentTextIcon,
      category: 'documents',
      required: true
    },
    {
      key: 'shop_tour_completed',
      title: 'Shop Tour',
      description: 'Familiarization with shop layout and policies',
      icon: AcademicCapIcon,
      category: 'training',
      required: false
    },
    {
      key: 'pos_training_completed',
      title: 'POS Training',
      description: 'Point of sale system training',
      icon: CogIcon,
      category: 'training',
      required: true
    },
    {
      key: 'booking_system_training',
      title: 'Booking System',
      description: 'Online booking platform training',
      icon: CalendarDaysIcon,
      category: 'training',
      required: true
    },
    {
      key: 'chair_assigned',
      title: 'Chair Assignment',
      description: 'Designated work station assignment',
      icon: UserIcon,
      category: 'setup',
      required: true
    },
    {
      key: 'supplies_provided',
      title: 'Supplies Provided',
      description: 'Basic supplies and tools provided',
      icon: CogIcon,
      category: 'setup',
      required: false
    },
    {
      key: 'keys_provided',
      title: 'Keys Provided',
      description: 'Shop access keys and codes',
      icon: KeyIcon,
      category: 'setup',
      required: false
    },
    {
      key: 'payment_setup',
      title: 'Payment Setup',
      description: 'Bank account and payment method configuration',
      icon: BanknotesIcon,
      category: 'financial',
      required: true
    },
    {
      key: 'tax_forms_completed',
      title: 'Tax Forms',
      description: 'W-9 and other tax documentation',
      icon: DocumentTextIcon,
      category: 'financial',
      required: true
    }
  ]

  const getStepStatus = (stepKey) => {
    if (!onboardingData?.onboarding) return 'pending'
    return onboardingData.onboarding[stepKey] ? 'completed' : 'pending'
  }

  const getStepIcon = (step) => {
    const status = getStepStatus(step.key)
    const IconComponent = step.icon
    
    if (status === 'completed') {
      return <CheckCircleIcon className="h-6 w-6 text-green-600" />
    }
    
    return <IconComponent className={`h-6 w-6 ${step.required ? 'text-red-500' : 'text-gray-400'}`} />
  }

  const getProgressByCategory = () => {
    const categories = ['setup', 'documents', 'training', 'financial']
    const progress = {}
    
    categories.forEach(category => {
      const categorySteps = onboardingSteps.filter(step => step.category === category)
      const completedSteps = categorySteps.filter(step => getStepStatus(step.key) === 'completed')
      progress[category] = {
        completed: completedSteps.length,
        total: categorySteps.length,
        percentage: Math.round((completedSteps.length / categorySteps.length) * 100)
      }
    })
    
    return progress
  }

  const StepCard = ({ step }) => {
    const status = getStepStatus(step.key)
    const isCompleted = status === 'completed'
    
    return (
      <div 
        className={`p-4 rounded-lg border transition-all cursor-pointer ${
          isCompleted 
            ? 'bg-green-50 border-green-200' 
            : step.required 
              ? 'bg-red-50 border-red-200' 
              : 'bg-gray-50 border-gray-200'
        } ${activeStep === step.key ? 'ring-2 ring-olive-500' : ''}`}
        onClick={() => setActiveStep(activeStep === step.key ? null : step.key)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {getStepIcon(step)}
            <div className="flex-1">
              <h3 className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                {step.title}
                {step.required && !isCompleted && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <p className={`text-sm ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                {step.description}
              </p>
              {onboardingData?.onboarding?.[`${step.key}_at`] && (
                <p className="text-xs text-gray-500 mt-1">
                  Completed: {new Date(onboardingData.onboarding[`${step.key}_at`]).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateOnboardingStep(step.key, !isCompleted)
            }}
            disabled={updating}
            className={`ml-3 px-3 py-1 rounded text-sm font-medium transition-colors ${
              isCompleted
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            } disabled:opacity-50`}
          >
            {updating ? '...' : isCompleted ? 'Undo' : 'Complete'}
          </button>
        </div>
        
        {/* Expanded content */}
        {activeStep === step.key && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              {step.category === 'documents' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Document
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
                    <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}
              
              {step.key === 'chair_assigned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chair Number
                  </label>
                  <input
                    type="number"
                    placeholder="Enter chair number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        updateOnboardingStep('chair_assigned', true, { chair_number: parseInt(e.target.value) })
                      }
                    }}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any notes about this step..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const CategorySection = ({ category, steps }) => {
    const progress = getProgressByCategory()[category]
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {category} ({progress.completed}/{progress.total})
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-olive-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{progress.percentage}%</span>
          </div>
        </div>
        <div className="space-y-3">
          {steps.map(step => (
            <StepCard key={step.key} step={step} />
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  const overallProgress = onboardingData?.onboarding?.calculated_progress || 0
  const categories = ['setup', 'documents', 'training', 'financial']

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Barber Onboarding</h1>
            <p className="text-gray-600">Complete all required steps to activate this barber</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-olive-600">{overallProgress}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-olive-600 h-3 rounded-full transition-all duration-500" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        {/* Status Alert */}
        {overallProgress === 100 ? (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Onboarding Complete!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              This barber is fully onboarded and ready to start working.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">Onboarding In Progress</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              {onboardingSteps.filter(s => s.required && getStepStatus(s.key) !== 'completed').length} required steps remaining.
            </p>
          </div>
        )}
      </div>

      {/* Categories */}
      {categories.map(category => {
        const categorySteps = onboardingSteps.filter(step => step.category === category)
        return (
          <CategorySection 
            key={category} 
            category={category} 
            steps={categorySteps} 
          />
        )
      })}
    </div>
  )
}