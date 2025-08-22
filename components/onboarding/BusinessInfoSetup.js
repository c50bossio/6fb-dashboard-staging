'use client'

import {
  BuildingOfficeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function BusinessInfoSetup({ data = {}, updateData, onComplete }) {
  const [formData, setFormData] = useState({
    businessName: data.businessName || '',
    businessType: data.businessType || 'barbershop',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    updateData(newData)
    
    // Clear validation error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm() && onComplete) {
      onComplete(formData, { autoAdvance: true })
    }
  }

  const isFormValid = formData.businessName.trim().length > 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
        <p className="text-gray-600">Let's set up your business profile</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.businessName 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-brand-500'
            }`}
            placeholder="Enter your business name"
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
            value={formData.businessType}
            onChange={(e) => handleChange('businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="barbershop">Barbershop</option>
            <option value="salon">Hair Salon</option>
            <option value="spa">Spa</option>
          </select>
        </div>
      </div>
      
      {isFormValid && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-green-700">
              Perfect! {formData.businessName} is ready to go online.
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!isFormValid}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            isFormValid
              ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
          {isFormValid && <CheckCircleIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}