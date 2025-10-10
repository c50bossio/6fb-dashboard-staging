'use client'

import { useState } from 'react'
import { validateCommission, validateBoothRent } from '@/lib/form-validation'

/**
 * Step 3: Financial Configuration
 * Sets up commission or booth rent payment model
 */
export default function OnboardingStep3Financial({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({})

  const handleModelChange = (model) => {
    setErrors({})
    onChange({
      financialModel: model,
      // Reset values when switching models
      commissionPercentage: model === 'commission' ? (data.commissionPercentage || 60) : 0,
      boothRentAmount: model === 'booth_rent' ? (data.boothRentAmount || 0) : 0,
      boothRentFrequency: model === 'booth_rent' ? (data.boothRentFrequency || 'weekly') : null,
    })
  }

  const handleChange = (field, value) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    onChange({ [field]: value })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!data.financialModel) {
      newErrors.financialModel = 'Please select a financial model'
      setErrors(newErrors)
      return false
    }

    if (data.financialModel === 'commission') {
      const commissionValidation = validateCommission(data.commissionPercentage)
      if (!commissionValidation.valid) {
        newErrors.commissionPercentage = commissionValidation.error
      }
    }

    if (data.financialModel === 'booth_rent') {
      const boothRentValidation = validateBoothRent(data.boothRentAmount)
      if (!boothRentValidation.valid) {
        newErrors.boothRentAmount = boothRentValidation.error
      }

      if (!data.boothRentFrequency) {
        newErrors.boothRentFrequency = 'Please select payment frequency'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Setup</h2>
        <p className="text-gray-600 mt-1">
          Configure how <strong>{data.firstName} {data.lastName}</strong> gets paid
        </p>
      </div>

      {/* Financial Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Model <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Commission Model */}
          <button
            type="button"
            onClick={() => handleModelChange('commission')}
            className={`relative p-6 border-2 rounded-lg text-left transition-all ${
              data.financialModel === 'commission'
                ? 'border-olive-500 bg-olive-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            {/* Radio Indicator */}
            <div className="absolute top-4 right-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                data.financialModel === 'commission'
                  ? 'border-olive-600 bg-olive-600'
                  : 'border-gray-300'
              }`}>
                {data.financialModel === 'commission' && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">Commission</h3>
              <p className="text-sm text-gray-600 mt-1">
                Barber receives a percentage of each service
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>Best for:</strong> Motivated teams, performance-based pay
                </p>
              </div>
            </div>
          </button>

          {/* Booth Rent Model */}
          <button
            type="button"
            onClick={() => handleModelChange('booth_rent')}
            className={`relative p-6 border-2 rounded-lg text-left transition-all ${
              data.financialModel === 'booth_rent'
                ? 'border-olive-500 bg-olive-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            {/* Radio Indicator */}
            <div className="absolute top-4 right-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                data.financialModel === 'booth_rent'
                  ? 'border-olive-600 bg-olive-600'
                  : 'border-gray-300'
              }`}>
                {data.financialModel === 'booth_rent' && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">Booth Rent</h3>
              <p className="text-sm text-gray-600 mt-1">
                Barber pays fixed weekly/monthly rent
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>Best for:</strong> Experienced barbers, independent contractors
                </p>
              </div>
            </div>
          </button>
        </div>

        {errors.financialModel && (
          <p className="text-red-600 text-sm mt-2">{errors.financialModel}</p>
        )}
      </div>

      {/* Commission Configuration */}
      {data.financialModel === 'commission' && (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Rate</h3>

          <div>
            <label htmlFor="commissionPercentage" className="block text-sm font-medium text-gray-700 mb-2">
              Percentage <span className="text-red-500">*</span>
            </label>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                id="commissionPercentage"
                min="0"
                max="100"
                step="5"
                value={data.commissionPercentage || 60}
                onChange={(e) => handleChange('commissionPercentage', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-olive-600"
              />

              {/* Percentage Display */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">0%</span>
                <div className="text-center">
                  <div className="text-3xl font-bold text-olive-600">
                    {data.commissionPercentage || 60}%
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Barber keeps {data.commissionPercentage || 60}%, shop gets{' '}
                    {100 - (data.commissionPercentage || 60)}%
                  </p>
                </div>
                <span className="text-sm text-gray-600">100%</span>
              </div>
            </div>

            {errors.commissionPercentage && (
              <p className="text-red-600 text-sm mt-2">{errors.commissionPercentage}</p>
            )}

            {/* Example Calculation */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Example Calculation</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Service price:</span>
                  <span className="font-medium">$40.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Barber receives ({data.commissionPercentage || 60}%):</span>
                  <span className="font-medium">${((40 * (data.commissionPercentage || 60)) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shop receives ({100 - (data.commissionPercentage || 60)}%):</span>
                  <span className="font-medium">${((40 * (100 - (data.commissionPercentage || 60))) / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booth Rent Configuration */}
      {data.financialModel === 'booth_rent' && (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booth Rent Details</h3>

          <div className="space-y-4">
            {/* Rent Amount */}
            <div>
              <label htmlFor="boothRentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Rent Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="boothRentAmount"
                  min="0"
                  step="10"
                  value={data.boothRentAmount || ''}
                  onChange={(e) => handleChange('boothRentAmount', parseFloat(e.target.value))}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
                    errors.boothRentAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="150.00"
                />
              </div>
              {errors.boothRentAmount && (
                <p className="text-red-600 text-sm mt-1">{errors.boothRentAmount}</p>
              )}
            </div>

            {/* Payment Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Frequency <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('boothRentFrequency', 'weekly')}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    data.boothRentFrequency === 'weekly'
                      ? 'border-olive-500 bg-olive-50 text-olive-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('boothRentFrequency', 'monthly')}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    data.boothRentFrequency === 'monthly'
                      ? 'border-olive-500 bg-olive-50 text-olive-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
              {errors.boothRentFrequency && (
                <p className="text-red-600 text-sm mt-1">{errors.boothRentFrequency}</p>
              )}
            </div>

            {/* Rent Summary */}
            {data.boothRentAmount > 0 && data.boothRentFrequency && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Payment Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Booth rent ({data.boothRentFrequency}):</span>
                    <span className="font-medium">${data.boothRentAmount.toFixed(2)}</span>
                  </div>
                  {data.boothRentFrequency === 'weekly' && (
                    <div className="flex justify-between text-xs">
                      <span>Approximate monthly:</span>
                      <span className="font-medium">${(data.boothRentAmount * 4.33).toFixed(2)}</span>
                    </div>
                  )}
                  {data.boothRentFrequency === 'monthly' && (
                    <div className="flex justify-between text-xs">
                      <span>Approximate weekly:</span>
                      <span className="font-medium">${(data.boothRentAmount / 4.33).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  💡 Barber keeps 100% of service revenue
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 text-white bg-olive-600 rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200"
        >
          Continue to Review
        </button>
      </div>
    </div>
  )
}
