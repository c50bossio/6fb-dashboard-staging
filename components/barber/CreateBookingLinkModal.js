'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  LinkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function CreateBookingLinkModal({ isOpen, onClose, onSave, barberId }) {
  const [formData, setFormData] = useState({
    name: '',
    services: [],
    timeSlots: [],
    duration: 45,
    customPrice: '',
    discount: 0,
    expiresAt: '',
    description: '',
    requirePhone: true,
    requireEmail: true,
    allowReschedule: true,
    sendReminders: true
  })

  const [availableServices, setAvailableServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [previewUrl, setPreviewUrl] = useState('')

  // Mock services - in production this would come from API
  const Services = [
    { id: 1, name: 'Classic Cut', duration: 30, price: 35, category: 'Haircuts' },
    { id: 2, name: 'Fade Cut', duration: 45, price: 45, category: 'Haircuts' },
    { id: 3, name: 'Buzz Cut', duration: 15, price: 25, category: 'Haircuts' },
    { id: 4, name: 'Beard Trim', duration: 20, price: 20, category: 'Beard Services' },
    { id: 5, name: 'Beard Sculpting', duration: 30, price: 35, category: 'Beard Services' },
    { id: 6, name: 'Hot Towel Shave', duration: 45, price: 50, category: 'Premium Services' },
    { id: 7, name: 'Hair Wash & Style', duration: 25, price: 30, category: 'Add-ons' },
    { id: 8, name: 'Eyebrow Trim', duration: 10, price: 15, category: 'Add-ons' }
  ]

  const timeSlotOptions = [
    { id: 'morning', label: 'Morning (9AM-12PM)', value: 'morning' },
    { id: 'afternoon', label: 'Afternoon (12PM-5PM)', value: 'afternoon' },
    { id: 'evening', label: 'Evening (5PM-8PM)', value: 'evening' },
    { id: 'weekend', label: 'Weekends Only', value: 'weekend' },
    { id: 'weekdays', label: 'Weekdays Only', value: 'weekdays' },
    { id: 'flexible', label: 'Any Available Time', value: 'flexible' }
  ]

  useEffect(() => {
    if (isOpen) {
      setAvailableServices(mockServices)
      generatePreviewUrl()
    }
  }, [isOpen, formData])

  useEffect(() => {
    generatePreviewUrl()
  }, [formData, barberId])

  const generatePreviewUrl = () => {
    const params = new URLSearchParams()
    
    if (formData.services.length > 0) {
      params.append('services', formData.services.map(s => s.id).join(','))
    }
    if (formData.timeSlots.length > 0) {
      params.append('timeSlots', formData.timeSlots.join(','))
    }
    if (formData.duration !== 45) {
      params.append('duration', formData.duration)
    }
    if (formData.customPrice) {
      params.append('price', formData.customPrice)
    }
    if (formData.discount > 0) {
      params.append('discount', formData.discount)
    }
    if (formData.expiresAt) {
      params.append('expires', formData.expiresAt)
    }

    const baseUrl = `/book/${barberId || 'your-id'}`
    const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
    setPreviewUrl(fullUrl)
  }

  const handleServiceToggle = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.find(s => s.id === service.id)
        ? prev.services.filter(s => s.id !== service.id)
        : [...prev.services, service]
    }))
  }

  const handleTimeSlotToggle = (slot) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter(s => s !== slot)
        : [...prev.timeSlots, slot]
    }))
  }

  const calculateTotalDuration = () => {
    if (formData.services.length === 0) return formData.duration
    return formData.services.reduce((total, service) => total + service.duration, 0)
  }

  const calculateTotalPrice = () => {
    if (formData.customPrice) return parseFloat(formData.customPrice)
    if (formData.services.length === 0) return 0
    
    const basePrice = formData.services.reduce((total, service) => total + service.price, 0)
    return formData.discount > 0 ? basePrice * (1 - formData.discount / 100) : basePrice
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const linkData = {
        ...formData,
        url: previewUrl,
        totalDuration: calculateTotalDuration(),
        totalPrice: calculateTotalPrice(),
        barberId
      }
      
      await onSave(linkData)
      
      // Reset form
      setFormData({
        name: '',
        services: [],
        timeSlots: [],
        duration: 45,
        customPrice: '',
        discount: 0,
        expiresAt: '',
        description: '',
        requirePhone: true,
        requireEmail: true,
        allowReschedule: true,
        sendReminders: true
      })
      setCurrentStep(1)
      onClose()
    } catch (error) {
      console.error('Failed to save booking link:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && (formData.services.length > 0 || formData.customPrice)
      case 2:
        return formData.timeSlots.length > 0
      case 3:
        return true
      default:
        return false
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Booking Link</h2>
            <p className="text-sm text-gray-600">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-3 hover:bg-gray-100 rounded-lg transition-all flex items-center justify-center"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}>Services & Pricing</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}>Time & Availability</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}>Settings & Review</span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Step 1: Services & Pricing */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Quick Fade Special, Weekend Package"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Services
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableServices.map(service => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceToggle(service)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.services.find(s => s.id === service.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">{service.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${service.price}</p>
                          <p className="text-sm text-gray-600">{service.duration}min</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Price (Optional)
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.customPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, customPrice: e.target.value }))}
                      placeholder="Override pricing"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration Override
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 45 }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Pricing Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Duration:</span>
                    <span className="font-medium text-blue-900">{calculateTotalDuration()} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Price:</span>
                    <span className="font-medium text-blue-900">${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                  {formData.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount Applied:</span>
                      <span className="font-medium">{formData.discount}% off</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Time & Availability */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available Time Slots *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeSlotOptions.map(slot => (
                    <div
                      key={slot.id}
                      onClick={() => handleTimeSlotToggle(slot.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.timeSlots.includes(slot.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{slot.label.split(' (')[0]}</h4>
                          <p className="text-sm text-gray-600">{slot.label.includes('(') ? slot.label.split('(')[1].replace(')', '') : ''}</p>
                        </div>
                        {formData.timeSlots.includes(slot.value) && (
                          <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Expires On (Optional)
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any special instructions or notes for customers..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Settings & Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Requirements</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requirePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, requirePhone: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require phone number</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requireEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, requireEmail: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require email address</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowReschedule}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowReschedule: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow customers to reschedule</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sendReminders}
                      onChange={(e) => setFormData(prev => ({ ...prev, sendReminders: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Send appointment reminders</span>
                  </label>
                </div>
              </div>

              {/* Link Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Link Preview</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Link Name:</p>
                    <p className="text-gray-900">{formData.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">URL:</p>
                    <p className="text-sm font-mono bg-white p-2 rounded border break-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}{previewUrl}
                    </p>
                  </div>
                  
                  {formData.services.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Services:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.services.map(service => (
                          <span key={service.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {service.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Duration:</p>
                      <p className="text-gray-900">{calculateTotalDuration()} minutes</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Price:</p>
                      <p className="text-gray-900">${calculateTotalPrice().toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                Create Link
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}