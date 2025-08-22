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

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    updateData(newData)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
        <p className="text-gray-600">Let's set up your business profile</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Enter your business name"
          />
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
      
      {formData.businessName && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-green-700">
              Great! Your business setup is looking good.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}