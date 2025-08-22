'use client'

import {
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  IdentificationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function BusinessInfoSetup({ data = {}, updateData, onComplete }) {
  // Progressive disclosure state
  const [progressiveStep, setProgressiveStep] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const [formData, setFormData] = useState({
    businessName: data.businessName || '',
    businessType: data.businessType || 'barbershop',
    businessAddress: data.businessAddress || '',
    businessCity: data.businessCity || '',
    businessState: data.businessState || '',
    businessZip: data.businessZip || '',
    businessPhone: data.businessPhone || '',
    businessEmail: data.businessEmail || '',
    businessWebsite: data.businessWebsite || '',
    businessDescription: data.businessDescription || '',
    businessLicense: data.businessLicense || '',
    yearEstablished: data.yearEstablished || new Date().getFullYear(),
    numberOfChairs: data.numberOfChairs || 1,
    parkingAvailable: data.parkingAvailable !== undefined ? data.parkingAvailable : true,
    wheelchairAccessible: data.wheelchairAccessible !== undefined ? data.wheelchairAccessible : true,
    wifiAvailable: data.wifiAvailable !== undefined ? data.wifiAvailable : true
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isValidating, setIsValidating] = useState(false)

  // Business type options with gradient backgrounds instead of emojis
  const businessTypes = [
    { value: 'barbershop', label: 'Barbershop', gradient: 'from-blue-500 to-blue-600' },
    { value: 'salon', label: 'Hair Salon', gradient: 'from-pink-500 to-pink-600' },
    { value: 'spa', label: 'Beauty Spa', gradient: 'from-purple-500 to-purple-600' },
    { value: 'mobile', label: 'Mobile Service', gradient: 'from-green-500 to-green-600' },
    { value: 'home', label: 'Home-Based', gradient: 'from-amber-500 to-amber-600' },
    { value: 'hybrid', label: 'Hybrid Model', gradient: 'from-indigo-500 to-indigo-600' }
  ]

  // US States for dropdown
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  // Progressive step definitions
  const progressiveSteps = [
    {
      id: 1,
      title: "What's your business?",
      description: "Just the basics to get started",
      fields: ['businessName', 'businessType'],
      requiredFields: ['businessName']
    },
    {
      id: 2,
      title: "Where are you located?",
      description: "Help customers find you",
      fields: ['businessAddress', 'businessCity', 'businessState', 'businessZip', 'businessPhone'],
      requiredFields: ['businessAddress', 'businessCity', 'businessState', 'businessZip', 'businessPhone']
    },
    {
      id: 3,
      title: "Tell us more",
      description: "Optional details to make your business shine",
      fields: ['businessEmail', 'businessWebsite', 'businessDescription', 'yearEstablished', 'numberOfChairs', 'businessLicense', 'parkingAvailable', 'wheelchairAccessible', 'wifiAvailable'],
      requiredFields: []
    }
  ]

  // Get current step info
  const currentStepInfo = progressiveSteps.find(step => step.id === progressiveStep)
  const stepProgress = (progressiveStep / progressiveSteps.length) * 100

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case 'businessName':
        if (!value || value.length < 2) {
          return 'Business name must be at least 2 characters'
        }
        if (value.length > 100) {
          return 'Business name must be less than 100 characters'
        }
        break
      case 'businessPhone':
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
        if (value && !phoneRegex.test(value.replace(/\D/g, ''))) {
          return 'Please enter a valid phone number'
        }
        break
      case 'businessEmail':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (value && !emailRegex.test(value)) {
          return 'Please enter a valid email address'
        }
        break
      case 'businessWebsite':
        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
          return 'Website must start with http:// or https://'
        }
        break
      case 'businessZip':
        const zipRegex = /^\d{5}(-\d{4})?$/
        if (value && !zipRegex.test(value)) {
          return 'Please enter a valid ZIP code'
        }
        break
      case 'yearEstablished':
        const year = parseInt(value)
        const currentYear = new Date().getFullYear()
        if (year < 1900 || year > currentYear) {
          return `Year must be between 1900 and ${currentYear}`
        }
        break
    }
    return null
  }

  // Handle input changes
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field
    const error = validateField(name, value)
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    }
    
    // Update parent data
    if (updateData) {
      updateData({ ...formData, [name]: value })
    }
  }

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  // Validate all required fields
  const validateForm = () => {
    const newErrors = {}
    
    // Required fields
    if (!formData.businessName) {
      newErrors.businessName = 'Business name is required'
    }
    if (!formData.businessAddress) {
      newErrors.businessAddress = 'Address is required'
    }
    if (!formData.businessCity) {
      newErrors.businessCity = 'City is required'
    }
    if (!formData.businessState) {
      newErrors.businessState = 'State is required'
    }
    if (!formData.businessZip) {
      newErrors.businessZip = 'ZIP code is required'
    }
    if (!formData.businessPhone) {
      newErrors.businessPhone = 'Phone number is required'
    }
    
    // Validate all fields
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key])
      if (error) {
        newErrors[key] = error
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Progressive step navigation
  const canProceedFromStep = (step) => {
    const stepInfo = progressiveSteps.find(s => s.id === step)
    if (!stepInfo) return false
    
    return stepInfo.requiredFields.every(field => {
      const value = formData[field]
      return value && value.toString().trim() !== '' && !validateField(field, value)
    })
  }

  const handleNextStep = () => {
    if (!canProceedFromStep(progressiveStep)) {
      // Mark required fields as touched to show validation errors
      const stepInfo = progressiveSteps.find(s => s.id === progressiveStep)
      const newTouched = { ...touched }
      stepInfo.requiredFields.forEach(field => {
        newTouched[field] = true
      })
      setTouched(newTouched)
      return
    }

    setIsTransitioning(true)
    setTimeout(() => {
      setProgressiveStep(prev => Math.min(prev + 1, progressiveSteps.length))
      setIsTransitioning(false)
    }, 150)
  }

  const handlePreviousStep = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setProgressiveStep(prev => Math.max(prev - 1, 1))
      setIsTransitioning(false)
    }, 150)
  }

  // Handle form submission
  const handleSubmit = () => {
    setIsValidating(true)
    
    if (validateForm()) {
      if (onComplete) {
        onComplete(formData)
      }
    } else {
      // Mark all fields as touched to show errors
      const allTouched = {}
      Object.keys(formData).forEach(key => {
        allTouched[key] = true
      })
      setTouched(allTouched)
    }
    
    setIsValidating(false)
  }

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (updateData && Object.keys(touched).length > 0) {
        updateData(formData)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [formData])

  return (
    <div className="space-y-6">
      {/* Progressive Step Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{currentStepInfo.title}</h3>
          <span className="text-sm text-gray-500">Step {progressiveStep} of {progressiveSteps.length}</span>
        </div>
        <p className="text-gray-600 mb-4">{currentStepInfo.description}</p>
        
        {/* Mini progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-brand-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
      </div>

      {/* Progressive Content */}
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Step 1: Business Basics */}
        {progressiveStep === 1 && (
          <div className="space-y-6">
            {/* Business Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of business is this?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {businessTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleChange('businessType', type.value)}
                    className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                      formData.businessType === type.value
                        ? 'border-brand-600 bg-brand-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${type.gradient} mb-2 mx-auto`}></div>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your business name? <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.businessName && touched.businessName
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                  placeholder="e.g., Tom's Barbershop"
                />
              </div>
              {errors.businessName && touched.businessName && (
                <p className="mt-1 text-sm text-red-600 flex items-center animate-fadeIn">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.businessName}
                </p>
              )}
              
              {/* Encouraging message */}
              {formData.businessName && formData.businessName.length > 2 && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
                  <div className="flex items-center">
                    <SparklesIcon className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-700">
                      Great! <strong>{formData.businessName}</strong> sounds like a fantastic business name.
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    💡 Next we'll help customers find you with your location details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Location & Contact */}
        {progressiveStep === 2 && (
          <div className="space-y-6">
            {/* Address Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.businessAddress}
                  onChange={(e) => handleChange('businessAddress', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.businessAddress && touched.businessAddress
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                  placeholder="123 Main Street"
                />
              </div>
              {errors.businessAddress && touched.businessAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.businessCity}
                  onChange={(e) => handleChange('businessCity', e.target.value)}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.businessCity && touched.businessCity
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                  placeholder="Los Angeles"
                />
                {errors.businessCity && touched.businessCity && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessCity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.businessState}
                  onChange={(e) => handleChange('businessState', e.target.value)}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.businessState && touched.businessState
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                >
                  <option value="">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.businessState && touched.businessState && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessState}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.businessZip}
                onChange={(e) => handleChange('businessZip', e.target.value)}
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.businessZip && touched.businessZip
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                }`}
                placeholder="90001"
                maxLength="10"
              />
              {errors.businessZip && touched.businessZip && (
                <p className="mt-1 text-sm text-red-600">{errors.businessZip}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => handleChange('businessPhone', formatPhoneNumber(e.target.value))}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.businessPhone && touched.businessPhone
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                  placeholder="(555) 123-4567"
                />
              </div>
              {errors.businessPhone && touched.businessPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>
              )}
            </div>

            {/* Progress encouragement */}
            {canProceedFromStep(2) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fadeIn">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-700">
                    Perfect! Customers can now find and contact your business.
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  💡 The final step adds optional details to make your business stand out
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Additional Details */}
        {progressiveStep === 3 && (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email (Optional)
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => handleChange('businessEmail', e.target.value)}
                    className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.businessEmail && touched.businessEmail
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                    }`}
                    placeholder="info@barbershop.com"
                  />
                </div>
                {errors.businessEmail && touched.businessEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website (Optional)
                </label>
                <div className="relative">
                  <GlobeAltIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.businessWebsite}
                    onChange={(e) => handleChange('businessWebsite', e.target.value)}
                    className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.businessWebsite && touched.businessWebsite
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                    }`}
                    placeholder="https://www.example.com"
                  />
                </div>
                {errors.businessWebsite && touched.businessWebsite && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessWebsite}</p>
                )}
              </div>
            </div>

            {/* Business Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description (Optional)
              </label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => handleChange('businessDescription', e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all focus:shadow-md"
                rows="3"
                placeholder="Tell customers what makes your business special..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Established
                </label>
                <input
                  type="number"
                  value={formData.yearEstablished}
                  onChange={(e) => handleChange('yearEstablished', e.target.value)}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    errors.yearEstablished && touched.yearEstablished
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500 focus:shadow-md'
                  }`}
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {errors.yearEstablished && touched.yearEstablished && (
                  <p className="mt-1 text-sm text-red-600">{errors.yearEstablished}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Chairs
                </label>
                <input
                  type="number"
                  value={formData.numberOfChairs}
                  onChange={(e) => handleChange('numberOfChairs', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all focus:shadow-md"
                  min="1"
                  max="50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business License # (Optional)
              </label>
              <div className="relative">
                <IdentificationIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.businessLicense}
                  onChange={(e) => handleChange('businessLicense', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all focus:shadow-md"
                  placeholder="License number"
                />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Amenities & Features
              </label>
              <div className="space-y-3">
                <label className="flex items-center hover:bg-gray-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.parkingAvailable}
                    onChange={(e) => handleChange('parkingAvailable', e.target.checked)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Parking Available</span>
                </label>
                <label className="flex items-center hover:bg-gray-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.wheelchairAccessible}
                    onChange={(e) => handleChange('wheelchairAccessible', e.target.checked)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Wheelchair Accessible</span>
                </label>
                <label className="flex items-center hover:bg-gray-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.wifiAvailable}
                    onChange={(e) => handleChange('wifiAvailable', e.target.checked)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">WiFi Available</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button
          onClick={handlePreviousStep}
          disabled={progressiveStep === 1}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            progressiveStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Previous
        </button>

        <div className="flex-1 flex justify-center">
          <div className="text-sm text-gray-500">
            {Object.keys(errors).filter(key => currentStepInfo.requiredFields.includes(key)).length === 0 && 
             currentStepInfo.requiredFields.some(field => touched[field]) && (
              <span className="flex items-center text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Step {progressiveStep} complete
              </span>
            )}
          </div>
        </div>

        {progressiveStep < progressiveSteps.length ? (
          <button
            onClick={handleNextStep}
            className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${
              canProceedFromStep(progressiveStep)
                ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-md transition-all flex items-center gap-2"
          >
            Complete
            <CheckCircleIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}