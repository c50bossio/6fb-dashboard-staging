'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAmericasIcon,
  CreditCardIcon,
  CheckCircleIcon,
  SparklesIcon,
  ChartBarIcon,
  LightBulbIcon,
  BellAlertIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function TenantSignup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Business Information
    name: '',
    email: '',
    phone: '',
    business_type: 'barbershop',
    
    // Address
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    
    // Configuration
    timezone: 'America/New_York',
    plan_tier: 'professional',
    
    // Owner Information
    owner_user: {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const planOptions = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      description: 'Perfect for single-location barbershops',
      features: [
        'Basic analytics and reporting',
        'Email alerts and notifications',
        'Up to 100 customers',
        '90-day data retention',
        'Email support'
      ],
      limits: {
        users: 3,
        locations: 1
      },
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 79,
      description: 'Best for growing barbershop businesses',
      features: [
        'Advanced predictive analytics',
        'Real-time alerts and insights',
        'AI business recommendations',
        'Up to 500 customers',
        '1-year data retention',
        'Priority support',
        'Custom branding'
      ],
      limits: {
        users: 10,
        locations: 3
      },
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      description: 'For multi-location barbershop chains',
      features: [
        'Full AI-powered business intelligence',
        'Custom AI model training',
        'Unlimited customers and data',
        'White-label options',
        'Dedicated success manager',
        'API access and integrations',
        'Advanced security features'
      ],
      limits: {
        users: 'Unlimited',
        locations: 'Unlimited'
      },
      popular: false
    }
  ]

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  const validateStep = (stepNumber) => {
    const newErrors = {}
    
    if (stepNumber === 1) {
      // Business information validation
      if (!formData.name.trim()) newErrors.name = 'Business name is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      if (formData.email && !isValidEmail(formData.email)) newErrors.email = 'Invalid email format'
    }
    
    if (stepNumber === 2) {
      // Address validation
      if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required'
      if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required'
      if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required'
      if (!formData.address.zip.trim()) newErrors['address.zip'] = 'ZIP code is required'
    }
    
    if (stepNumber === 4) {
      // Owner information validation
      if (!formData.owner_user.first_name.trim()) newErrors['owner_user.first_name'] = 'First name is required'
      if (!formData.owner_user.last_name.trim()) newErrors['owner_user.last_name'] = 'Last name is required'
      if (!formData.owner_user.email.trim()) newErrors['owner_user.email'] = 'Email is required'
      if (formData.owner_user.email && !isValidEmail(formData.owner_user.email)) {
        newErrors['owner_user.email'] = 'Invalid email format'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          data: formData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Redirect to onboarding or dashboard
        router.push(`${result.data.onboarding_url}&welcome=true`)
      } else {
        setErrors({ submit: result.error || 'Failed to create account' })
      }
      
    } catch (error) {
      console.error('Signup error:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Tell us about your barbershop</h2>
        <p className="mt-2 text-gray-600">Let's start with the basics</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange(null, 'name', e.target.value)}
            placeholder="e.g., Downtown Barbershop"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Email *
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange(null, 'email', e.target.value)}
              placeholder="owner@yourbarbershop.com"
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange(null, 'phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <PhoneIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type
          </label>
          <select
            value={formData.business_type}
            onChange={(e) => handleInputChange(null, 'business_type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="barbershop">Barbershop</option>
            <option value="salon">Hair Salon</option>
            <option value="spa">Spa & Wellness</option>
            <option value="beauty">Beauty Services</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GlobeAmericasIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Where are you located?</h2>
        <p className="mt-2 text-gray-600">This helps us provide localized features</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.address.street}
            onChange={(e) => handleInputChange('address', 'street', e.target.value)}
            placeholder="123 Main Street"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors['address.street'] ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors['address.street'] && <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) => handleInputChange('address', 'city', e.target.value)}
              placeholder="New York"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['address.city'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors['address.city'] && <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              value={formData.address.state}
              onChange={(e) => handleInputChange('address', 'state', e.target.value)}
              placeholder="NY"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['address.state'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors['address.state'] && <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={formData.address.zip}
              onChange={(e) => handleInputChange('address', 'zip', e.target.value)}
              placeholder="10001"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['address.zip'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors['address.zip'] && <p className="mt-1 text-sm text-red-600">{errors['address.zip']}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={formData.address.country}
              onChange={(e) => handleInputChange('address', 'country', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange(null, 'timezone', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Toronto">Toronto (ET)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCardIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Choose your plan</h2>
        <p className="mt-2 text-gray-600">Start with a 14-day free trial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planOptions.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
              formData.plan_tier === plan.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => handleInputChange(null, 'plan_tier', plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <div>Up to {plan.limits.users} users</div>
                <div>Up to {plan.limits.locations} locations</div>
              </div>
            </div>

            {formData.plan_tier === plan.id && (
              <div className="absolute top-4 right-4">
                <CheckCircleIcon className="h-6 w-6 text-blue-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <SparklesIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <strong>14-day free trial included!</strong> No credit card required. 
            You can upgrade, downgrade, or cancel anytime.
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Owner information</h2>
        <p className="mt-2 text-gray-600">Create your admin account</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.owner_user.first_name}
              onChange={(e) => handleInputChange('owner_user', 'first_name', e.target.value)}
              placeholder="John"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['owner_user.first_name'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors['owner_user.first_name'] && <p className="mt-1 text-sm text-red-600">{errors['owner_user.first_name']}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.owner_user.last_name}
              onChange={(e) => handleInputChange('owner_user', 'last_name', e.target.value)}
              placeholder="Smith"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['owner_user.last_name'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors['owner_user.last_name'] && <p className="mt-1 text-sm text-red-600">{errors['owner_user.last_name']}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.owner_user.email}
              onChange={(e) => handleInputChange('owner_user', 'email', e.target.value)}
              placeholder="john@yourbarbershop.com"
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors['owner_user.email'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {errors['owner_user.email'] && <p className="mt-1 text-sm text-red-600">{errors['owner_user.email']}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.owner_user.phone}
              onChange={(e) => handleInputChange('owner_user', 'phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <PhoneIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
          <div className="text-sm text-blue-800">
            <strong>You're almost done!</strong> After creating your account, you'll get immediate access to:
            <ul className="mt-2 space-y-1 ml-4">
              <li className="flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Advanced business analytics dashboard
              </li>
              <li className="flex items-center">
                <LightBulbIcon className="h-4 w-4 mr-2" />
                AI-powered business recommendations
              </li>
              <li className="flex items-center">
                <BellAlertIcon className="h-4 w-4 mr-2" />
                Real-time alerts and notifications
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= stepNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form content */}
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Error message */}
          {errors.submit && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className={`px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                Next
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}