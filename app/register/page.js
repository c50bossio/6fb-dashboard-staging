'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { 
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, signInWithGoogle, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Business Info
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessType: 'barbershop',
    
    // Plan Selection
    selectedPlan: 'professional'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Clear any leftover CAPTCHA errors on component mount
  useEffect(() => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.captcha
      // Also clear any submit errors that mention captcha
      if (newErrors.submit && newErrors.submit.includes('captcha')) {
        delete newErrors.submit
      }
      return newErrors
    })
  }, [])

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return phoneRegex.test(phone)
  }

  const validateStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required'
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number'
      }
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (!validatePassword(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number'
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    if (step === 2) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
      if (!formData.businessAddress.trim()) newErrors.businessAddress = 'Business address is required'
      if (!formData.businessPhone.trim()) {
        newErrors.businessPhone = 'Business phone is required'
      } else if (!validatePhone(formData.businessPhone)) {
        newErrors.businessPhone = 'Please enter a valid business phone number'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Validate single field on blur
    const newErrors = { ...errors }
    if (field === 'email' && formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (field === 'password' && formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number'
    }
    if (field === 'confirmPassword' && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if ((field === 'phone' || field === 'businessPhone') && formData[field] && !validatePhone(formData[field])) {
      newErrors[field] = 'Please enter a valid phone number'
    }
    
    setErrors(newErrors)
  }

  const plans = [
    {
      name: 'Starter',
      price: '$49',
      period: '/month',
      description: 'Perfect for single barbershop locations',
      features: [
        'Up to 500 customers',
        '2,000 SMS/month',
        '5,000 emails/month',
        'Basic analytics',
        'Email support'
      ],
      value: 'starter'
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      description: 'Ideal for growing barbershop businesses',
      features: [
        'Up to 2,000 customers',
        '10,000 SMS/month',
        '25,000 emails/month',
        'Advanced analytics',
        'Priority support',
        'Custom integrations'
      ],
      featured: true,
      value: 'professional'
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For multiple locations and franchises',
      features: [
        'Unlimited customers',
        'Unlimited SMS/emails',
        'Multi-location management',
        'White-label options',
        'Dedicated account manager',
        'Custom AI training'
      ],
      value: 'enterprise'
    }
  ]

  const handleChange = (e) => {
    console.log('Form field changed:', e.target.name, '=', e.target.value)
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear specific field error when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      })
    }
  }

  // Separate handler for plan selection to prevent form submission
  const handlePlanSelection = (planValue, e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Plan selected:', planValue)
    setFormData({
      ...formData,
      selectedPlan: planValue
    })
    // Clear plan selection error if any
    if (errors.selectedPlan) {
      setErrors({
        ...errors,
        selectedPlan: ''
      })
    }
  }

  // Removed duplicate validateStep function - using the comprehensive one above

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Next button clicked - current step:', currentStep)
    if (validateStep(currentStep)) {
      console.log('Validation passed, moving to step:', currentStep + 1)
      setCurrentStep(currentStep + 1)
    } else {
      console.log('Validation failed for step:', currentStep)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('Form submitted - Current step:', currentStep)
    
    if (!validateStep(currentStep)) return

    if (currentStep < 3) {
      console.log('Moving to next step:', currentStep + 1)
      setCurrentStep(currentStep + 1)
      return
    }

    // Final submission - only happens on step 3 when user clicks "Create account"
    console.log('Final submission - creating account')
    setIsLoading(true)
    setErrors({})

    try {
      // Use real authentication with Supabase
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        metadata: {
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          shop_name: formData.businessName || undefined,
          phone: formData.phone || undefined,
          selected_plan: formData.selectedPlan
        }
      })
      
      // Show success message briefly before redirect
      setErrors({ 
        submit: '✅ Account created successfully! Redirecting to email confirmation...',
        isSuccess: true 
      })
      
      // Wait 1.5 seconds to show success message, then redirect
      setTimeout(() => {
        // Check if email verification is required
        if (result?.requiresEmailConfirmation) {
          // Redirect to confirmation page with email parameter
          router.push(`/register/confirm?email=${encodeURIComponent(formData.email)}`)
        } else {
          // If no email verification required, redirect to dashboard
          router.push('/dashboard')
        }
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      
      // Handle specific Supabase errors with user-friendly messages
      if (err.message && (err.message.includes('security purposes') || err.message.includes('temporarily busy'))) {
        setErrors({ 
          submit: 'Registration is busy right now. We\'re automatically retrying... If this persists, please wait a moment and try again.',
          isSuccess: false 
        })
      } else if (err.message && err.message.includes('User already registered')) {
        setErrors({ 
          submit: 'This email is already registered. Try logging in instead, or use a different email address.',
          isSuccess: false 
        })
      } else if (err.message && err.message.includes('email_address_invalid')) {
        setErrors({ 
          submit: 'Please enter a valid email address. Some email domains (like example.com) are not supported for security reasons.',
          isSuccess: false 
        })
      } else if (err.message && err.message.includes('email domains may not be supported')) {
        setErrors({ 
          submit: err.message,
          isSuccess: false 
        })
      } else if (err.message && err.message.includes('invalid')) {
        setErrors({ 
          submit: 'Please check your information and try again. Make sure to use a real email address.',
          isSuccess: false 
        })
      } else {
        setErrors({ 
          submit: err.message || 'Registration failed. Please check your information and try again.',
          isSuccess: false 
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true)
      setErrors({})
      console.log('🔐 Starting Google sign-up...')
      
      await signInWithGoogle()
      
      // The redirect will happen automatically, so we don't need to do anything else here
      console.log('🔐 Google sign-up initiated, redirecting...')
      
    } catch (err) {
      console.error('🔐 Google sign-up error:', err)
      setErrors({ 
        submit: err.message || 'Google sign-up failed. Please try again.',
        isSuccess: false 
      })
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First name
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.firstName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John"
            />
          </div>
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last name
          </label>
          <div className="mt-1">
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.lastName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Doe"
            />
          </div>
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="john@barbershop.com"
          />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone number
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <PhoneIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="(555) 123-4567"
          />
        </div>
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockClosedIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-10 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter a secure password"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockClosedIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-10 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
          Business name
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            value={formData.businessName}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.businessName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Premium Cuts Barbershop"
          />
        </div>
        {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
      </div>

      <div>
        <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">
          Business address
        </label>
        <div className="mt-1">
          <textarea
            id="businessAddress"
            name="businessAddress"
            rows={3}
            required
            value={formData.businessAddress}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.businessAddress ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="123 Main Street, Suite 100, City, State 12345"
          />
        </div>
        {errors.businessAddress && <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>}
      </div>

      <div>
        <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700">
          Business phone
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <PhoneIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="businessPhone"
            name="businessPhone"
            type="tel"
            required
            value={formData.businessPhone}
            onChange={handleChange}
            className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.businessPhone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="(555) 987-6543"
          />
        </div>
        {errors.businessPhone && <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>}
      </div>

      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
          Business type
        </label>
        <div className="mt-1">
          <select
            id="businessType"
            name="businessType"
            value={formData.businessType}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="barbershop">Barbershop</option>
            <option value="salon">Hair Salon</option>
            <option value="spa">Beauty Spa</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-gray-900">Choose your plan</h3>
        <p className="text-gray-600">You can change or cancel anytime</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div 
            key={plan.value} 
            onClick={(e) => handlePlanSelection(plan.value, e)}
            className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
            formData.selectedPlan === plan.value 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          } ${plan.featured ? 'ring-2 ring-blue-500' : ''}`}>
            <input
              type="radio"
              name="selectedPlan"
              value={plan.value}
              checked={formData.selectedPlan === plan.value}
              onChange={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Radio input changed - preventing default')
              }}
              className="sr-only"
            />
            
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Recommended
                </span>
              </div>
            )}
            
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600">{plan.period}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              <ul className="text-left space-y-2">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-sm text-gray-500">+ {plan.features.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>


      <div className="text-center text-sm text-gray-600">
        <p>🎉 <strong>Free 14-day trial</strong> • No credit card required</p>
        <p className="mt-1">You'll be charged only after your trial ends</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">6FB</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your barbershop account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in here
          </Link>
        </p>

        {/* Progress bar */}
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-8 mt-2">
            <span className="text-xs text-gray-600">Personal</span>
            <span className="text-xs text-gray-600">Business</span>
            <span className="text-xs text-gray-600">Plan</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit}>
            {errors.submit && (
              <div className={`mb-6 px-4 py-3 rounded-md text-sm ${
                errors.isSuccess 
                  ? 'bg-green-50 border border-green-200 text-green-600' 
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {errors.submit}
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            <div className="mt-8 flex justify-between">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn-secondary"
                >
                  Previous
                </button>
              )}
              
              <div className="ml-auto">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || authLoading}
                    className={`btn-primary ${(isLoading || authLoading) ? 'opacity-75 cursor-not-allowed bg-gray-400' : ''}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating account...
                      </div>
                    ) : (
                      'Create account'
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Google Sign-up Option */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={isLoading || authLoading}
                className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium ${
                  (isLoading || authLoading)
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                onClick={handleGoogleSignUp}
              >
                {(isLoading || authLoading) ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                    Signing up...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back to home link */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to home page
        </Link>
      </div>
    </div>
  )
}