'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function ScheduleDemoModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1) // 1: Info, 2: Schedule, 3: Confirmation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: 'barbershop', // barbershop, salon, spa, other
    currentSoftware: '',
    primaryChallenge: '',
    preferredDate: '',
    preferredTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    message: ''
  })

  const [availableSlots] = useState([
    { date: '2025-01-15', times: ['10:00 AM', '2:00 PM', '4:00 PM'] },
    { date: '2025-01-16', times: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'] },
    { date: '2025-01-17', times: ['10:00 AM', '12:00 PM', '2:00 PM'] },
    { date: '2025-01-18', times: ['9:00 AM', '11:00 AM', '4:00 PM'] }
  ])

  const businessTypes = [
    { value: 'barbershop', label: 'Barbershop' },
    { value: 'salon', label: 'Hair Salon' },
    { value: 'spa', label: 'Spa' },
    { value: 'beauty_clinic', label: 'Beauty Clinic' },
    { value: 'franchise', label: 'Franchise/Multi-location' },
    { value: 'other', label: 'Other' }
  ]

  const challenges = [
    'Managing appointments and scheduling',
    'Customer communication and retention',
    'Financial tracking and reporting',
    'Staff management and commissions',
    'Marketing and customer acquisition',
    'Inventory and product sales',
    'Online presence and booking',
    'Operational efficiency',
    'Customer data management',
    'Other (please specify)'
  ]

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setStep(1)
      setError('')
      setSuccess(false)
      setLoading(false)
    }
  }, [isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Please enter your name')
      return false
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.businessName.trim()) {
      setError('Please enter your business name')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.preferredDate) {
      setError('Please select a preferred date')
      return false
    }
    if (!formData.preferredTime) {
      setError('Please select a preferred time')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Simulate API call to schedule demo
      const response = await fetch('/api/schedule-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setStep(3)
        setSuccess(true)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to schedule demo. Please try again.')
      }
    } catch (err) {
      console.error('Demo scheduling error:', err)
      setError('Something went wrong. Please try again or contact us directly.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 1 && "Schedule Your Personal Demo"}
              {step === 2 && "Choose Your Preferred Time"}
              {step === 3 && "Demo Scheduled Successfully!"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 && "See how 6FB AI can transform your business"}
              {step === 2 && "Select a time that works best for you"}
              {step === 3 && "We'll send you a confirmation email shortly"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center">
            <div className={`flex items-center ${step >= 1 ? 'text-brand-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Your Info</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${step >= 2 ? 'bg-brand-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 2 ? 'text-brand-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Schedule</span>
            </div>
            <div className={`w-12 h-0.5 mx-4 ${step >= 3 ? 'bg-brand-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 3 ? 'text-brand-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Contact Information */}
          {step === 1 && (
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <UserIcon className="inline h-4 w-4 mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="john@barbershop.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <PhoneIcon className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BuildingStorefrontIcon className="inline h-4 w-4 mr-1" />
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Smith's Barbershop"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  {businessTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Challenge (Optional)
                </label>
                <select
                  name="primaryChallenge"
                  value={formData.primaryChallenge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Select your biggest challenge...</option>
                  {challenges.map(challenge => (
                    <option key={challenge} value={challenge}>
                      {challenge}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Schedule Selection */}
          {step === 2 && (
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 mr-2" />
                  Available Times
                </h3>
                
                <div className="grid gap-4">
                  {availableSlots.map(slot => (
                    <div key={slot.date} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {formatDate(slot.date)}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {slot.times.map(time => (
                          <button
                            key={`${slot.date}-${time}`}
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              preferredDate: slot.date, 
                              preferredTime: time 
                            }))}
                            className={`p-2 text-sm rounded-lg border transition-all ${
                              formData.preferredDate === slot.date && formData.preferredTime === time
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-brand-500 hover:bg-brand-50'
                            }`}
                          >
                            <ClockIcon className="h-4 w-4 inline mr-1" />
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Any specific questions or requirements for the demo..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircleIcon className="h-16 w-16 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Your demo has been scheduled!
                </h3>
                <p className="text-gray-600">
                  We've sent a confirmation email to {formData.email}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Demo Details:</h4>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(formData.preferredDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{formData.preferredTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">30 minutes</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>A member of our team will call you at the scheduled time.</p>
                <p className="mt-2">Need to reschedule? Contact us at <a href="mailto:demo@6fb.com" className="text-brand-600 hover:underline">demo@6fb.com</a></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          {step === 3 ? (
            <button
              onClick={onClose}
              className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium transition-all"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={step === 1 ? onClose : () => setStep(step - 1)}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition-all"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <button
                onClick={handleNext}
                disabled={loading}
                className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium disabled:opacity-50 transition-all flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  step === 1 ? 'Continue' : 'Schedule Demo'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}