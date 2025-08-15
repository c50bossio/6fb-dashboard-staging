'use client'

import { 
  ChevronRightIcon, 
  CheckCircleIcon, 
  BuildingStorefrontIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { useAuth } from '../../components/SupabaseAuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui'
import { useTenant } from '../../contexts/TenantContext'


const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to 6FB AI',
    subtitle: 'Let\'s get your barbershop set up for success',
    icon: SparklesIcon
  },
  {
    id: 'business',
    title: 'Business Details',
    subtitle: 'Tell us about your barbershop',
    icon: BuildingStorefrontIcon
  },
  {
    id: 'preferences',
    title: 'AI Preferences',
    subtitle: 'Customize your AI assistant',
    icon: CogIcon
  },
  {
    id: 'complete',
    title: 'All Set!',
    subtitle: 'Your AI-powered barbershop is ready',
    icon: CheckCircleIcon
  }
]

export default function OnboardingPage() {
  const { user } = useAuth()
  const { tenant, setTenant, tenantId } = useTenant()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState({
    businessName: '',
    businessType: 'independent_barbershop',
    address: '',
    phone: '',
    services: [],
    operatingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '08:00', close: '17:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: false }
    },
    aiPreferences: {
      coaching_style: 'encouraging',
      focus_areas: ['customer_service', 'business_growth'],
      notification_frequency: 'daily',
      analytics_level: 'detailed'
    }
  })

  useEffect(() => {
    if (tenant?.onboarding_completed) {
      router.push('/dashboard')
    }
  }, [tenant, router])

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      const newTenant = {
        id: tenantId || `barbershop_${Date.now()}`,
        name: onboardingData.businessName,
        owner_id: user.id,
        subscription_tier: 'professional',
        onboarding_completed: true,
        settings: {
          business_name: onboardingData.businessName,
          business_type: onboardingData.businessType,
          address: onboardingData.address,
          phone: onboardingData.phone,
          services: onboardingData.services,
          operating_hours: onboardingData.operatingHours,
          ai_preferences: onboardingData.aiPreferences
        },
        features: {
          ai_chat: true,
          analytics: true,
          booking_system: true,
          customer_management: true,
          financial_insights: true,
          marketing_tools: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setTenant(newTenant)

      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('onboarding_completed', {
          tenant_id: newTenant.id,
          business_name: newTenant.settings.business_name,
          business_type: newTenant.settings.business_type,
          ai_preferences: newTenant.settings.ai_preferences,
          features_enabled: Object.keys(newTenant.features).filter(key => newTenant.features[key]).length
        })
      }

      router.push('/dashboard?welcome=true')
    } catch (error) {
      console.error('Onboarding completion error:', error)
    }
  }

  const updateOnboardingData = (field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep]

    switch (step.id) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} />
      
      case 'business':
        return (
          <BusinessDetailsStep 
            data={onboardingData}
            updateData={updateOnboardingData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      
      case 'preferences':
        return (
          <AIPreferencesStep 
            data={onboardingData}
            updateData={updateOnboardingData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      
      case 'complete':
        return (
          <CompleteStep 
            data={onboardingData}
            onComplete={handleComplete}
            onPrevious={handlePrevious}
          />
        )
      
      default:
        return null
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to continue with onboarding.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 via-white to-gold-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors
                    ${isActive ? 'bg-olive-600 text-white' : ''}
                    ${isCompleted ? 'bg-moss-600 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                  `}>
                    <StepIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${isActive ? 'text-olive-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">{step.subtitle}</p>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-olive-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep) / (ONBOARDING_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}

function WelcomeStep({ onNext }) {
  return (
    <div className="p-8 text-center">
      <div className="mb-6">
        <SparklesIcon className="w-16 h-16 text-olive-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to 6FB AI Agent System
        </h1>
        <p className="text-xl text-gray-600">
          Your AI-powered barbershop management solution
        </p>
      </div>
      
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-olive-50 rounded-lg">
            <BuildingStorefrontIcon className="w-8 h-8 text-olive-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Business Management</h3>
            <p className="text-sm text-gray-600">Streamline operations and bookings</p>
          </div>
          <div className="p-4 bg-gold-50 rounded-lg">
            <SparklesIcon className="w-8 h-8 text-gold-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">AI Coaching</h3>
            <p className="text-sm text-gray-600">Get personalized business advice</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <CogIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
            <p className="text-sm text-gray-600">Track performance and growth</p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center px-6 py-3 bg-olive-600 text-white font-medium rounded-lg hover:bg-olive-700 transition-colors"
      >
        Get Started
        <ChevronRightIcon className="w-5 h-5 ml-2" />
      </button>
    </div>
  )
}

function BusinessDetailsStep({ data, updateData, onNext, onPrevious }) {
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!data.businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }
    if (!data.address.trim()) {
      newErrors.address = 'Address is required'
    }
    if (!data.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onNext()
    }
  }

  const serviceOptions = [
    'Haircuts', 'Beard Trimming', 'Shaves', 'Hair Washing', 
    'Styling', 'Coloring', 'Treatments', 'Eyebrow Trimming'
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your barbershop</h2>
        <p className="text-gray-600">This helps us customize your AI assistant for your specific business needs.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => updateData('businessName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.businessName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your barbershop name"
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type
          </label>
          <select
            value={data.businessType}
            onChange={(e) => updateData('businessType', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            <option value="independent_barbershop">Independent Barbershop</option>
            <option value="chain_location">Chain Location</option>
            <option value="salon_with_barber">Salon with Barber Services</option>
            <option value="mobile_barber">Mobile Barber</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => updateData('address', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123 Main St, City, State 12345"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => updateData('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Services Offered
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {serviceOptions.map((service) => (
              <label key={service} className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.services.includes(service)}
                  onChange={(e) => {
                    const newServices = e.target.checked
                      ? [...data.services, service]
                      : data.services.filter(s => s !== service)
                    updateData('services', newServices)
                  }}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{service}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onPrevious}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}

function AIPreferencesStep({ data, updateData, onNext, onPrevious }) {
  const coachingStyles = [
    { value: 'encouraging', label: 'Encouraging', description: 'Positive and motivational approach' },
    { value: 'direct', label: 'Direct', description: 'Straightforward and to-the-point' },
    { value: 'analytical', label: 'Analytical', description: 'Data-driven insights and recommendations' },
    { value: 'collaborative', label: 'Collaborative', description: 'Interactive and discussion-based' }
  ]

  const focusAreas = [
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'business_growth', label: 'Business Growth' },
    { value: 'financial_management', label: 'Financial Management' },
    { value: 'marketing', label: 'Marketing & Promotion' },
    { value: 'operations', label: 'Operations Efficiency' },
    { value: 'staff_management', label: 'Staff Management' }
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customize Your AI Assistant</h2>
        <p className="text-gray-600">Set up your AI coach to match your communication style and business priorities.</p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Coaching Style
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coachingStyles.map((style) => (
              <label key={style.value} className={`
                p-4 border-2 rounded-lg cursor-pointer transition-colors
                ${data.aiPreferences.coaching_style === style.value 
                  ? 'border-olive-500 bg-olive-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}>
                <input
                  type="radio"
                  name="coaching_style"
                  value={style.value}
                  checked={data.aiPreferences.coaching_style === style.value}
                  onChange={(e) => updateData('aiPreferences', {
                    ...data.aiPreferences,
                    coaching_style: e.target.value
                  })}
                  className="sr-only"
                />
                <div className="font-medium text-gray-900">{style.label}</div>
                <div className="text-sm text-gray-600">{style.description}</div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Focus Areas (Select up to 3)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {focusAreas.map((area) => (
              <label key={area.value} className={`
                flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                ${data.aiPreferences.focus_areas.includes(area.value)
                  ? 'border-olive-500 bg-olive-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}>
                <input
                  type="checkbox"
                  checked={data.aiPreferences.focus_areas.includes(area.value)}
                  onChange={(e) => {
                    const currentAreas = data.aiPreferences.focus_areas
                    const newAreas = e.target.checked
                      ? [...currentAreas, area.value].slice(0, 3) // Limit to 3
                      : currentAreas.filter(a => a !== area.value)
                    
                    updateData('aiPreferences', {
                      ...data.aiPreferences,
                      focus_areas: newAreas
                    })
                  }}
                  disabled={!data.aiPreferences.focus_areas.includes(area.value) && 
                           data.aiPreferences.focus_areas.length >= 3}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mr-3"
                />
                <span className="text-sm font-medium text-gray-700">{area.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Selected: {data.aiPreferences.focus_areas.length}/3
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Frequency
          </label>
          <select
            value={data.aiPreferences.notification_frequency}
            onChange={(e) => updateData('aiPreferences', {
              ...data.aiPreferences,
              notification_frequency: e.target.value
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            <option value="daily">Daily insights</option>
            <option value="weekly">Weekly summaries</option>
            <option value="monthly">Monthly reports</option>
            <option value="as_needed">Only when requested</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Analytics Detail Level
          </label>
          <select
            value={data.aiPreferences.analytics_level}
            onChange={(e) => updateData('aiPreferences', {
              ...data.aiPreferences,
              analytics_level: e.target.value
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            <option value="basic">Basic metrics</option>
            <option value="detailed">Detailed analytics</option>
            <option value="advanced">Advanced insights</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button
          type="button"
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function CompleteStep({ data, onComplete, onPrevious }) {
  return (
    <div className="p-8 text-center">
      <div className="mb-6">
        <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
        <p className="text-gray-600">Your AI-powered barbershop management system is ready to go.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Setup Summary</h3>
        <div className="text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Business:</span>
            <span className="font-medium">{data.businessName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium capitalize">{data.businessType.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Services:</span>
            <span className="font-medium">{data.services.length} selected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">AI Style:</span>
            <span className="font-medium capitalize">{data.aiPreferences.coaching_style}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Focus Areas:</span>
            <span className="font-medium">{data.aiPreferences.focus_areas.length} selected</span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">What's Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-olive-50 rounded-lg">
            <SparklesIcon className="w-8 h-8 text-olive-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Start Chatting</h4>
            <p className="text-sm text-gray-600">Ask your AI coach for business advice</p>
          </div>
          <div className="p-4 bg-gold-50 rounded-lg">
            <CogIcon className="w-8 h-8 text-gold-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Explore Analytics</h4>
            <p className="text-sm text-gray-600">View your business insights dashboard</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <BuildingStorefrontIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Manage Bookings</h4>
            <p className="text-sm text-gray-600">Start accepting and managing appointments</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center px-8 py-3 bg-moss-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Complete Setup
          <SparklesIcon className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}