'use client'

import { useState, useEffect } from 'react'
import { UserCircleIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'
import { validateBookingSlug } from '@/lib/form-validation'

/**
 * Step 4: Review & Generate Booking URL
 * Displays summary of all entered data and generates booking slug
 */
export default function OnboardingStep4Review({ data, onChange, onNext, onBack, onComplete, isLoading }) {
  const [generatedSlug, setGeneratedSlug] = useState(data.bookingSlug || '')
  const [isCustomSlug, setIsCustomSlug] = useState(false)
  const [slugError, setSlugError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Auto-generate slug on mount if not already set
  useEffect(() => {
    if (!data.bookingSlug && data.firstName && data.lastName) {
      generateSlug()
    }
  }, [data.firstName, data.lastName])

  const generateSlug = () => {
    const slug = `${data.firstName}-${data.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    setGeneratedSlug(slug)
    setIsCustomSlug(false)
    setSlugError(null)
    onChange({ bookingSlug: slug })
  }

  const handleSlugChange = (value) => {
    setGeneratedSlug(value)
    setIsCustomSlug(true)

    // Validate slug format
    const validation = validateBookingSlug(value)
    if (!validation.valid) {
      setSlugError(validation.error)
    } else {
      setSlugError(null)
      onChange({ bookingSlug: value })
    }
  }

  const handleCopyUrl = () => {
    const bookingUrl = `${window.location.origin}/book/${generatedSlug}`
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = () => {
    if (slugError) {
      return
    }

    if (!generatedSlug) {
      setSlugError('Booking slug is required')
      return
    }

    onComplete()
  }

  const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${generatedSlug}`

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Generate Link</h2>
        <p className="text-gray-600 mt-1">
          Review the details and generate a booking link for <strong>{data.firstName} {data.lastName}</strong>
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-6">
        {/* Personal Info Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserCircleIcon className="h-5 w-5 mr-2" />
            Personal Information
          </h3>

          <div className="flex items-start space-x-4">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {data.photoUrl || data.photo ? (
                <img
                  src={data.photoUrl || (data.photo ? URL.createObjectURL(data.photo) : null)}
                  alt={`${data.firstName} ${data.lastName}`}
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                  <UserCircleIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium text-gray-900">{data.firstName} {data.lastName}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium text-gray-900">{data.email}</p>
              </div>
              {data.phone && (
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium text-gray-900">{data.phone}</p>
                </div>
              )}
              {data.specialties && data.specialties.length > 0 && (
                <div className="md:col-span-2">
                  <span className="text-gray-600">Specialties:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-olive-100 text-olive-800"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.bio && (
                <div className="md:col-span-2">
                  <span className="text-gray-600">Bio:</span>
                  <p className="text-gray-900 mt-1">{data.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Assigned Services
          </h3>
          <div className="flex flex-wrap gap-2">
            {(data.selectedServices || []).length > 0 ? (
              <>
                <span className="text-sm text-gray-600">
                  {data.selectedServices.length} service{data.selectedServices.length !== 1 ? 's' : ''} selected
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500 italic">No services selected</span>
            )}
          </div>
        </div>

        {/* Financial Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Financial Arrangement
          </h3>
          {data.financialModel === 'commission' && (
            <div className="flex items-center justify-between p-4 bg-olive-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Commission Model</p>
                <p className="text-sm text-gray-600 mt-1">
                  Barber receives {data.commissionPercentage}% of each service
                </p>
              </div>
              <div className="text-3xl font-bold text-olive-600">
                {data.commissionPercentage}%
              </div>
            </div>
          )}
          {data.financialModel === 'booth_rent' && (
            <div className="flex items-center justify-between p-4 bg-olive-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Booth Rent Model</p>
                <p className="text-sm text-gray-600 mt-1">
                  ${data.boothRentAmount.toFixed(2)} {data.boothRentFrequency}
                </p>
              </div>
              <div className="text-3xl font-bold text-olive-600">
                ${data.boothRentAmount}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking URL Generation */}
      <div className="bg-gradient-to-r from-olive-50 to-moss-50 border-2 border-olive-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Public Booking Link
        </h3>

        {/* Slug Input */}
        <div className="mb-4">
          <label htmlFor="bookingSlug" className="block text-sm font-medium text-gray-700 mb-2">
            Booking Slug
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="bookingSlug"
              value={generatedSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
                slugError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john-smith"
            />
            <button
              type="button"
              onClick={generateSlug}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              Auto-Generate
            </button>
          </div>
          {slugError && (
            <p className="text-red-600 text-sm mt-1">{slugError}</p>
          )}
          {isCustomSlug && !slugError && (
            <p className="text-blue-600 text-sm mt-1">
              ℹ️ Using custom slug (make sure it's unique)
            </p>
          )}
        </div>

        {/* Generated URL Display */}
        {!slugError && generatedSlug && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shareable URL
            </label>
            <div className="flex items-center space-x-2 p-4 bg-white border-2 border-olive-300 rounded-lg">
              <code className="flex-1 text-sm text-olive-800 font-mono break-all">
                {bookingUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-shrink-0 p-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <DocumentDuplicateIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Share this link with clients to book directly with {data.firstName}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !!slugError || !generatedSlug}
          className="px-8 py-2 text-white bg-moss-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Complete Onboarding'
          )}
        </button>
      </div>
    </div>
  )
}
