'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { 
  EyeIcon,
  EyeOffIcon,
  LockClosedIcon,
  MailIcon,
  OfficeBuildingIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/outline'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading: authLoading, error: authError } = useAuth()
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

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.lastName) newErrors.lastName = 'Last name is required'
      if (!formData.email) newErrors.email = 'Email is required'
      if (!formData.phone) newErrors.phone = 'Phone number is required'
      if (!formData.password) newErrors.password = 'Password is required'
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    }

    if (step === 2) {
      if (!formData.businessName) newErrors.businessName = 'Business name is required'
      if (!formData.businessAddress) newErrors.businessAddress = 'Business address is required'
      if (!formData.businessPhone) newErrors.businessPhone = 'Business phone is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(currentStep)) return

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      return
    }

    // Final submission
    setIsLoading(true)
    setErrors({})

    try {
      // Use real authentication
      await register({
        email: formData.email,
        password: formData.password,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        barbershop_name: formData.businessName || undefined
      })
      
      // Redirect to dashboard on successful registration
      router.push('/dashboard')
    } catch (err) {
      setErrors({ submit: err.message || 'Registration failed. Please try again.' })
    } finally {
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
            <MailIcon className="h-5 w-5 text-gray-400" />
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
                <EyeOffIcon className="h-5 w-5" />
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
                <EyeOffIcon className="h-5 w-5" />
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
            <OfficeBuildingIcon className="h-5 w-5 text-gray-400" />
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
          <div key={plan.value} className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
            formData.selectedPlan === plan.value 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          } ${plan.featured ? 'ring-2 ring-blue-500' : ''}`}>
            <input
              type="radio"
              name="selectedPlan"
              value={plan.value}
              checked={formData.selectedPlan === plan.value}
              onChange={handleChange}
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
            {(errors.submit || authError) && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.submit || authError}
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
                    className={`btn-primary ${(isLoading || authLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
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